import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Play,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import { STYLE_OPTIONS } from '../data/defaults';
import type { ScheduledAudioLine } from '../lib/audioEngine';
import type { SceneConfig, StoryboardBeat } from '../types';
import { VideoPlayer } from './VideoPlayer';

interface VideoScreenProps {
  beats: StoryboardBeat[];
  scene: SceneConfig;
  scheduledLines: ScheduledAudioLine[];
  audioCtx: AudioContext | null;
  isGeneratingVoices: boolean;
  voiceError: string | null;
  voicesReady: boolean;
  onGenerateVoices: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function VideoScreen({
  beats,
  scene,
  scheduledLines,
  audioCtx,
  isGeneratingVoices,
  voiceError,
  voicesReady,
  onGenerateVoices,
  onBack,
  onNext,
}: VideoScreenProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [jumpReq, setJumpReq] = useState<{ time: number; seq: number } | null>(
    null
  );

  const styleMeta =
    STYLE_OPTIONS.find((s) => s.id === scene.style) ?? STYLE_OPTIONS[0];

  const activeBeatIndex = beats.findIndex(
    (b, idx) =>
      currentTime >= b.startSec &&
      (currentTime < b.endSec || idx === beats.length - 1)
  );

  const jumpToBeat = (startSec: number) => {
    setJumpReq({ time: startSec, seq: Date.now() });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-blue-600">Step 4 of 5</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            4-beat animated clip & English voices
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
            Playing all 4 beats sequentially in <span className="font-semibold text-slate-900">{styleMeta.label}</span> with distinct voices and burned-in subtitles.
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerateVoices}
          disabled={isGeneratingVoices}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          {isGeneratingVoices ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              Generating English Voices…
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              {voicesReady ? 'Regenerate Voices' : 'Generate English Voices'}
            </>
          )}
        </button>
      </div>

      {voiceError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-rose-800"
        >
          <span>{voiceError}</span>
          <button
            type="button"
            onClick={onGenerateVoices}
            className="min-h-[40px] px-3.5 rounded-lg bg-rose-600 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Retry Voice Generation
          </button>
        </div>
      )}

      {isGeneratingVoices && !voicesReady && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3.5 flex items-center gap-3 text-sm text-blue-950">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
          <span>
            Generating natural English voices for Jennie (female) and Mike (male) and syncing word-for-word subtitles…
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main 16:9 Player */}
        <div className="lg:col-span-8">
          <VideoPlayer
            beats={beats}
            scene={scene}
            scheduledLines={scheduledLines}
            audioCtx={audioCtx}
            jumpToTimeRequest={jumpReq}
            onTimeUpdate={setCurrentTime}
          />
        </div>

        {/* Beat Clips Sequence Panel */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Beat sequence (30s)
              </h2>
              <span className="text-xs text-slate-500">Tap beat to preview</span>
            </div>

            <div className="divide-y divide-slate-100">
              {beats.map((beat, idx) => {
                const isActive = idx === activeBeatIndex;
                return (
                  <button
                    key={beat.id}
                    type="button"
                    onClick={() => jumpToBeat(beat.startSec)}
                    className={`w-full text-left py-3 px-2.5 rounded-xl flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                      isActive ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            isActive ? 'text-blue-600' : 'text-slate-500'
                          }`}
                        >
                          {beat.timeRange}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-semibold text-slate-900">
                          {beat.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {beat.lines.map((l) => `${l.speaker}: ${l.text}`).join(' ')}
                      </p>
                    </div>
                    <Play
                      className={`w-4 h-4 shrink-0 mt-1 ${
                        isActive ? 'text-blue-600 fill-blue-600' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Volume2 className="w-4 h-4 text-blue-600" />
              Voice & visual consistency
            </div>
            <p>
              <strong className="text-slate-800">Jennie:</strong> Female voice · Yellow cardigan & jeans
            </p>
            <p>
              <strong className="text-slate-800">Mike:</strong> Male voice · Blue rolled-sleeve shirt
            </p>
            <p>
              <strong className="text-slate-800">Subtitles:</strong> White bold English text, bottom, max 2 lines
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Storyboard
        </button>

        <button
          type="button"
          onClick={onNext}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Next: Final Cut & Download
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
