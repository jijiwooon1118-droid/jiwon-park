import type { BeatId, StoryboardBeat } from '../types';

export interface ScheduledAudioLine {
  id: string;
  beatId: BeatId;
  speaker: string;
  text: string;
  buffer: AudioBuffer;
  startSec: number;
  endSec: number;
  durationSec: number;
}

interface TtsResponseClip {
  id: string;
  beatId: BeatId;
  speaker: string;
  text: string;
  audioBase64: string;
  mimeType: string;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function trimSilence(
  audioCtx: AudioContext,
  buffer: AudioBuffer,
  threshold = 0.008
): AudioBuffer {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const padSamples = Math.floor(sampleRate * 0.03);

  let start = 0;
  while (start < data.length && Math.abs(data[start]) < threshold) {
    start++;
  }

  let end = data.length - 1;
  while (end > start && Math.abs(data[end]) < threshold) {
    end--;
  }

  if (start >= end) {
    return buffer;
  }

  const trimmedStart = Math.max(0, start - padSamples);
  const trimmedEnd = Math.min(data.length, end + padSamples);
  const newLength = Math.max(1, trimmedEnd - trimmedStart);

  const trimmed = audioCtx.createBuffer(
    buffer.numberOfChannels,
    newLength,
    sampleRate
  );
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = trimmed.getChannelData(ch);
    dst.set(src.subarray(trimmedStart, trimmedEnd));
  }
  return trimmed;
}

export async function generateAndScheduleAudio(
  beats: StoryboardBeat[],
  audioCtx: AudioContext
): Promise<{
  scheduledLines: ScheduledAudioLine[];
  totalDurationSec: number;
}> {
  const payloadLines = beats.flatMap((beat) =>
    beat.lines
      .filter((l) => l.text.trim().length > 0)
      .map((l) => ({
        id: l.id,
        beatId: beat.id,
        speaker: l.speaker,
        text: l.text.trim(),
      }))
  );

  if (payloadLines.length === 0) {
    return { scheduledLines: [], totalDurationSec: 30 };
  }

  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines: payloadLines }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string }).error ||
        `Voice generation failed (${res.status})`
    );
  }

  const data = (await res.json()) as { clips: TtsResponseClip[] };
  const clipById = new Map<string, TtsResponseClip>();
  for (const c of data.clips) {
    clipById.set(c.id, c);
  }

  const scheduledLines: ScheduledAudioLine[] = [];

  for (const beat of beats) {
    const beatLines = beat.lines.filter((l) => l.text.trim().length > 0);
    let cursor = beat.startSec + 0.18;
    const beatEnd = beat.endSec;
    const available = Math.max(1, beatEnd - cursor - 0.15);

    const decoded: Array<{
      id: string;
      speaker: string;
      text: string;
      buffer: AudioBuffer;
      rawDur: number;
    }> = [];

    let totalRawDur = 0;
    for (const line of beatLines) {
      const clip = clipById.get(line.id);
      if (!clip) continue;
      const arrBuf = base64ToArrayBuffer(clip.audioBase64);
      const rawBuf = await audioCtx.decodeAudioData(arrBuf);
      const trimmedBuf = trimSilence(audioCtx, rawBuf);
      decoded.push({
        id: line.id,
        speaker: line.speaker,
        text: line.text.trim(),
        buffer: trimmedBuf,
        rawDur: trimmedBuf.duration,
      });
      totalRawDur += trimmedBuf.duration;
    }

    const gap = decoded.length > 1 ? 0.18 : 0;
    const needed = totalRawDur + gap * Math.max(0, decoded.length - 1);
    const scaleIfLong = needed > available ? available / needed : 1;

    for (const item of decoded) {
      const dur = item.rawDur * scaleIfLong;
      scheduledLines.push({
        id: item.id,
        beatId: beat.id,
        speaker: item.speaker,
        text: item.text,
        buffer: item.buffer,
        startSec: cursor,
        endSec: cursor + dur,
        durationSec: dur,
      });
      cursor += dur + gap;
    }
  }

  return {
    scheduledLines,
    totalDurationSec: 30,
  };
}
