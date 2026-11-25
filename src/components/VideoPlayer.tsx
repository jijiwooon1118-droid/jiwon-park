import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { ScheduledAudioLine } from '../lib/audioEngine';
import { renderVideoFrame, type ActiveSubtitle } from '../lib/videoRenderer';
import type { SceneConfig, StoryboardBeat } from '../types';

interface VideoPlayerProps {
  beats: StoryboardBeat[];
  scene: SceneConfig;
  scheduledLines: ScheduledAudioLine[];
  audioCtx: AudioContext | null;
  totalDurationSec?: number;
  jumpToTimeRequest?: { time: number; seq: number } | null;
  onTimeUpdate?: (timeSec: number) => void;
  showExportControls?: boolean;
  exportedBlobUrl?: string | null;
  onExportComplete?: (blobUrl: string) => void;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export function findActiveSubtitle(
  timeSec: number,
  scheduledLines: ScheduledAudioLine[],
  beats: StoryboardBeat[]
): ActiveSubtitle | null {
  // Primary: exact match with decoded & trimmed Gemini TTS audio schedule
  for (const line of scheduledLines) {
    if (timeSec >= line.startSec && timeSec <= line.endSec) {
      const progress = Math.min(
        1,
        Math.max(0, (timeSec - line.startSec) / Math.max(0.1, line.durationSec))
      );
      return {
        speaker: line.speaker,
        text: line.text,
        progress,
      };
    }
  }

  // Fallback before TTS loads: preview timing inside beat
  if (scheduledLines.length === 0) {
    for (const beat of beats) {
      if (
        timeSec >= beat.startSec &&
        timeSec < beat.endSec &&
        beat.lines.length > 0
      ) {
        const beatDur = beat.endSec - beat.startSec;
        const perLine = beatDur / beat.lines.length;
        const idx = Math.min(
          beat.lines.length - 1,
          Math.floor((timeSec - beat.startSec) / perLine)
        );
        const line = beat.lines[idx];
        const lineStart = beat.startSec + idx * perLine;
        return {
          speaker: line.speaker,
          text: line.text,
          progress: Math.min(1, Math.max(0, (timeSec - lineStart) / perLine)),
        };
      }
    }
  }

  return null;
}

export function VideoPlayer({
  beats,
  scene,
  scheduledLines,
  audioCtx,
  totalDurationSec = 30,
  jumpToTimeRequest,
  onTimeUpdate,
  showExportControls = false,
  exportedBlobUrl,
  onExportComplete,
}: VideoPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const timeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const playStartPerfRef = useRef(0);
  const playStartOffsetRef = useRef(0);
  const audioClockOriginRef = useRef<number | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const exportAbortRef = useRef(false);

  const stopScheduledAudio = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    activeSourcesRef.current = [];
  }, []);

  const drawAtTime = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const activeSubtitle = findActiveSubtitle(t, scheduledLines, beats);
      renderVideoFrame({
        ctx,
        width: canvas.width,
        height: canvas.height,
        timeSec: t,
        beats,
        scene,
        activeSubtitle,
        totalDurationSec,
      });
    },
    [beats, scene, scheduledLines, totalDurationSec]
  );

  // Redraw current frame whenever scene/beats/audio schedule updates
  useEffect(() => {
    drawAtTime(timeRef.current);
  }, [drawAtTime]);

  const scheduleAudioFrom = useCallback(
    async (offsetSec: number): Promise<number | null> => {
      stopScheduledAudio();
      if (!audioCtx || scheduledLines.length === 0) return null;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      if (!gainNodeRef.current) {
        gainNodeRef.current = audioCtx.createGain();
        gainNodeRef.current.connect(audioCtx.destination);
      }
      gainNodeRef.current.gain.value = isMuted ? 0 : 1;

      const baseAudioTime = audioCtx.currentTime;

      for (const line of scheduledLines) {
        if (line.endSec <= offsetSec) continue;

        const src = audioCtx.createBufferSource();
        src.buffer = line.buffer;
        const naturalRatio =
          line.buffer.duration / Math.max(0.1, line.durationSec);
        if (naturalRatio > 1.02) {
          src.playbackRate.value = Math.min(1.25, naturalRatio);
        }
        src.connect(gainNodeRef.current);

        if (line.startSec >= offsetSec) {
          const delay = line.startSec - offsetSec;
          src.start(baseAudioTime + delay);
        } else {
          const bufferOffset =
            (offsetSec - line.startSec) * src.playbackRate.value;
          if (bufferOffset < line.buffer.duration) {
            src.start(baseAudioTime, bufferOffset);
          }
        }
        activeSourcesRef.current.push(src);
      }

      return baseAudioTime;
    },
    [audioCtx, isMuted, scheduledLines, stopScheduledAudio]
  );

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  const pausePlayback = useCallback(() => {
    isPlayingRef.current = false;
    audioClockOriginRef.current = null;
    setIsPlaying(false);
    stopScheduledAudio();
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [stopScheduledAudio]);

  const startPlaybackFrom = useCallback(
    async (startSec: number) => {
      const clamped =
        startSec >= totalDurationSec - 0.05 ? 0 : Math.max(0, startSec);
      timeRef.current = clamped;
      setCurrentTime(clamped);
      onTimeUpdate?.(clamped);

      isPlayingRef.current = true;
      setIsPlaying(true);

      const baseAudioTime = await scheduleAudioFrom(clamped);
      if (!isPlayingRef.current) return;

      playStartOffsetRef.current = clamped;
      playStartPerfRef.current = performance.now();
      audioClockOriginRef.current =
        baseAudioTime !== null ? baseAudioTime - clamped : null;

      const tick = () => {
        if (!isPlayingRef.current) return;

        let nextT: number;
        if (
          audioCtx &&
          audioCtx.state === 'running' &&
          audioClockOriginRef.current !== null
        ) {
          nextT = Math.min(
            totalDurationSec,
            Math.max(0, audioCtx.currentTime - audioClockOriginRef.current)
          );
        } else {
          const elapsed = (performance.now() - playStartPerfRef.current) / 1000;
          nextT = Math.min(
            totalDurationSec,
            playStartOffsetRef.current + elapsed
          );
        }

        timeRef.current = nextT;
        setCurrentTime(nextT);
        onTimeUpdate?.(nextT);
        drawAtTime(nextT);

        if (nextT >= totalDurationSec) {
          pausePlayback();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [
      audioCtx,
      drawAtTime,
      onTimeUpdate,
      pausePlayback,
      scheduleAudioFrom,
      totalDurationSec,
    ]
  );

  const togglePlay = () => {
    if (exportProgress !== null) return;
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    if (isPlayingRef.current) {
      pausePlayback();
    } else {
      void startPlaybackFrom(timeRef.current);
    }
  };

  const handleSeek = (nextSec: number) => {
    if (exportProgress !== null) return;
    const clamped = Math.max(0, Math.min(totalDurationSec, nextSec));
    timeRef.current = clamped;
    setCurrentTime(clamped);
    onTimeUpdate?.(clamped);
    drawAtTime(clamped);
    if (isPlayingRef.current) {
      void startPlaybackFrom(clamped);
    }
  };

  // External beat jump requests
  useEffect(() => {
    if (jumpToTimeRequest) {
      void startPlaybackFrom(jumpToTimeRequest.time);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToTimeRequest?.seq]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      exportAbortRef.current = true;
      pausePlayback();
    };
  }, [pausePlayback]);

  const triggerFileDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `wow-${scene.style}-30s.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleExportVideo = async () => {
    if (exportedBlobUrl) {
      triggerFileDownload(exportedBlobUrl);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setExportError(null);
    pausePlayback();
    exportAbortRef.current = false;

    try {
      const stream = canvas.captureStream(30);

      const exportAudioCtx = audioCtx ?? new AudioContext();
      if (exportAudioCtx.state === 'suspended') {
        await exportAudioCtx.resume();
      }
      const dest = exportAudioCtx.createMediaStreamDestination();
      const exportSources: AudioBufferSourceNode[] = [];
      const baseTime = exportAudioCtx.currentTime + 0.05;

      for (const line of scheduledLines) {
        const src = exportAudioCtx.createBufferSource();
        src.buffer = line.buffer;
        const naturalRatio =
          line.buffer.duration / Math.max(0.1, line.durationSec);
        if (naturalRatio > 1.02) {
          src.playbackRate.value = Math.min(1.25, naturalRatio);
        }
        src.connect(dest);
        src.start(baseTime + line.startSec);
        exportSources.push(src);
      }

      const audioTracks = dest.stream.getAudioTracks();
      for (const track of audioTracks) {
        stream.addTrack(track);
      }

      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const chosenMime =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';

      const recorder = chosenMime
        ? new MediaRecorder(stream, {
            mimeType: chosenMime,
            videoBitsPerSecond: 3_500_000,
          })
        : new MediaRecorder(stream);

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: chosenMime || 'video/webm' }));
        };
      });

      recorder.start(250);
      setExportProgress(0);

      await new Promise<void>((resolve) => {
        const step = () => {
          if (exportAbortRef.current) {
            resolve();
            return;
          }
          const t = Math.min(
            totalDurationSec,
            Math.max(0, exportAudioCtx.currentTime - baseTime)
          );
          timeRef.current = t;
          setCurrentTime(t);
          setExportProgress(Math.round((t / totalDurationSec) * 100));
          drawAtTime(t);

          if (t >= totalDurationSec) {
            resolve();
            return;
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });

      for (const s of exportSources) {
        try {
          s.stop();
        } catch {
          // ignore
        }
      }
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }

      const blob = await recordingDone;
      if (!exportAbortRef.current && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        onExportComplete?.(url);
        triggerFileDownload(url);
      }
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : 'Video recording is not supported in this browser.'
      );
    } finally {
      setExportProgress(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* 16:9 Video Viewport */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-sm">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          onClick={togglePlay}
          className="w-full h-full block cursor-pointer"
        />

        {/* Center Play Overlay when paused */}
        {!isPlaying && exportProgress === null && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Play 30-second video"
            className="absolute inset-0 flex items-center justify-center bg-slate-950/20 hover:bg-slate-950/30 transition-colors cursor-pointer"
          >
            <span className="w-16 h-16 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-lg transition-transform hover:scale-105">
              {currentTime >= totalDurationSec - 0.1 ? (
                <RotateCcw className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 ml-0.5 fill-slate-900" />
              )}
            </span>
          </button>
        )}

        {exportProgress !== null && (
          <div className="absolute top-3 left-3 right-3 bg-slate-950/85 text-white rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              Recording 30s video with English voices & subtitles…
            </span>
            <span className="font-mono tabular-nums">{exportProgress}%</span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 px-3.5 py-2.5 flex flex-col gap-2.5">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={totalDurationSec}
            step={0.05}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            aria-label="Video timeline"
            className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePlay}
              disabled={exportProgress !== null}
              className="min-h-[44px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {currentTime >= totalDurationSec - 0.1 ? 'Replay' : 'Play'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSeek(0)}
              disabled={exportProgress !== null}
              aria-label="Restart from 0:00"
              className="min-h-[44px] min-w-[44px] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              className="min-h-[44px] min-w-[44px] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-600" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <span className="text-xs font-mono text-slate-600 tabular-nums ml-1">
              {formatTime(currentTime)} / {formatTime(totalDurationSec)}
            </span>
          </div>

          {showExportControls && (
            <button
              type="button"
              onClick={handleExportVideo}
              disabled={exportProgress !== null}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              {exportProgress !== null ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Exporting ({exportProgress}%)
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  {exportedBlobUrl ? 'Download Video (.webm)' : 'Render & Download Video'}
                </>
              )}
            </button>
          )}
        </div>

        {exportError && (
          <p className="text-xs text-rose-600">{exportError}</p>
        )}
      </div>
    </div>
  );
}
