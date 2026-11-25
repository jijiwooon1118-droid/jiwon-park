import { ArrowLeft, BookOpen, Film } from 'lucide-react';
import { STYLE_OPTIONS } from '../data/defaults';
import type { ScheduledAudioLine } from '../lib/audioEngine';
import type { ExpressionItem, SceneConfig, StoryboardBeat } from '../types';
import { VideoPlayer } from './VideoPlayer';

interface FinalScreenProps {
  expressions: ExpressionItem[];
  beats: StoryboardBeat[];
  scene: SceneConfig;
  scheduledLines: ScheduledAudioLine[];
  audioCtx: AudioContext | null;
  exportedBlobUrl: string | null;
  onExportComplete: (blobUrl: string) => void;
  onBack: () => void;
  onStartOver: () => void;
}

export function FinalScreen({
  expressions,
  beats,
  scene,
  scheduledLines,
  audioCtx,
  exportedBlobUrl,
  onExportComplete,
  onBack,
  onStartOver,
}: FinalScreenProps) {
  const styleMeta =
    STYLE_OPTIONS.find((s) => s.id === scene.style) ?? STYLE_OPTIONS[0];

  return (
    <section className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-blue-600">Step 5 of 5</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            Your 30-second English movie clip is ready
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Play, download your video with burned-in subtitles, and review every expression below.
          </p>
        </div>

        <div className="text-xs text-slate-500 whitespace-nowrap shrink-0">
          {styleMeta.label} · 30s · 4 beats
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Video Player with Download button */}
        <div className="lg:col-span-8">
          <VideoPlayer
            beats={beats}
            scene={scene}
            scheduledLines={scheduledLines}
            audioCtx={audioCtx}
            showExportControls
            exportedBlobUrl={exportedBlobUrl}
            onExportComplete={onExportComplete}
          />
        </div>

        {/* Expression Study Cards */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Expressions in this clip
          </div>

          <ul className="divide-y divide-slate-100">
            {expressions
              .filter((e) => e.expression.trim().length > 0)
              .map((item) => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.expression}
                  </p>
                  <p className="text-sm text-slate-700">{item.meaning}</p>
                  <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                    <Film className="w-3 h-3" />
                    {item.movie}
                  </p>
                </li>
              ))}
          </ul>
        </aside>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Video Studio
        </button>

        <button
          type="button"
          onClick={onStartOver}
          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Make Another Clip
        </button>
      </div>

      {/* Required Credit Line */}
      <footer className="pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
        Made with Google AI Studio · Script by jiwon park
      </footer>
    </section>
  );
}
