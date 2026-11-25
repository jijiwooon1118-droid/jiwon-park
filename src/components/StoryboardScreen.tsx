import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { countSpokenWords, findHighlightSegments } from '../lib/expressions';
import type {
  DialogueLine,
  ExpressionItem,
  SceneConfig,
  StoryboardBeat,
} from '../types';

interface StoryboardScreenProps {
  beats: StoryboardBeat[];
  expressions: ExpressionItem[];
  scene: SceneConfig;
  onChangeBeats: (next: StoryboardBeat[]) => void;
  onResetScript: () => void;
  onBack: () => void;
  onNext: () => void;
}

function HighlightedSpeech({
  text,
  expressions,
}: {
  text: string;
  expressions: ExpressionItem[];
}) {
  const segments = findHighlightSegments(text, expressions);
  return (
    <span>
      {segments.map((seg, i) =>
        seg.highlighted ? (
          <mark
            key={i}
            className="bg-amber-100 text-slate-950 font-semibold px-1 py-0.5 rounded underline decoration-amber-500 decoration-2 underline-offset-2"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}

export function StoryboardScreen({
  beats,
  expressions,
  scene,
  onChangeBeats,
  onResetScript,
  onBack,
  onNext,
}: StoryboardScreenProps) {
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [regeneratingBeatId, setRegeneratingBeatId] = useState<string | null>(
    null
  );
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const spokenWordCount = countSpokenWords(beats);

  const handleUpdateBeatScene = (beatId: string, nextScene: string) => {
    onChangeBeats(
      beats.map((b) => (b.id === beatId ? { ...b, scene: nextScene } : b))
    );
  };

  const handleUpdateLine = (
    beatId: string,
    lineId: string,
    field: keyof Omit<DialogueLine, 'id'>,
    value: string
  ) => {
    onChangeBeats(
      beats.map((b) =>
        b.id === beatId
          ? {
              ...b,
              lines: b.lines.map((l) =>
                l.id === lineId ? { ...l, [field]: value } : l
              ),
            }
          : b
      )
    );
  };

  const handleAddLine = (beatId: string) => {
    onChangeBeats(
      beats.map((b) =>
        b.id === beatId
          ? {
              ...b,
              lines: [
                ...b.lines,
                {
                  id: `${beatId}-l-${Date.now()}`,
                  speaker: 'Jennie',
                  text: '',
                },
              ],
            }
          : b
      )
    );
  };

  const handleDeleteLine = (beatId: string, lineId: string) => {
    onChangeBeats(
      beats.map((b) =>
        b.id === beatId
          ? { ...b, lines: b.lines.filter((l) => l.id !== lineId) }
          : b
      )
    );
  };

  const handleRegenerateBeat = async (beatIndex: number) => {
    const target = beats[beatIndex];
    if (!target) return;

    setErrorMsg(null);
    setRegeneratingBeatId(target.id);
    try {
      const res = await fetch('/api/storyboard/regenerate-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beatIndex, beats, expressions, scene }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not regenerate beat.');
      }

      onChangeBeats(
        beats.map((b, idx) => (idx === beatIndex ? data.beat : b))
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to regenerate beat.'
      );
    } finally {
      setRegeneratingBeatId(null);
    }
  };

  const handleRegenerateAll = async () => {
    setErrorMsg(null);
    setRegeneratingAll(true);
    try {
      const res = await fetch('/api/storyboard/generate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressions, scene }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate storyboard.');
      }
      if (Array.isArray(data.beats) && data.beats.length === 4) {
        onChangeBeats(data.beats);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to rewrite storyboard.'
      );
    } finally {
      setRegeneratingAll(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-blue-600">Step 3 of 5</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            30-second 4-beat storyboard
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
            Every target expression is highlighted below. Edit any line directly or regenerate a beat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {spokenWordCount} spoken words · 30s
          </span>
          <button
            type="button"
            onClick={handleRegenerateAll}
            disabled={regeneratingAll}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            {regeneratingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Rewrite All Beats
          </button>
          <button
            type="button"
            onClick={onResetScript}
            className="min-h-[44px] px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Default Script
          </button>
        </div>
      </div>

      {/* Expression checklist legend */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-semibold text-slate-700">Target expressions:</span>
        {expressions
          .filter((e) => e.expression.trim().length > 0)
          .map((e, i) => (
            <span key={e.id} className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="bg-amber-100 text-slate-950 font-semibold px-1.5 py-0.5 rounded underline decoration-amber-500">
                {e.expression}
              </span>
              {i < expressions.length - 1 && (
                <span aria-hidden="true" className="text-slate-300">
                  /
                </span>
              )}
            </span>
          ))}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {beats.map((beat, beatIndex) => {
          const isEditing = editingBeatId === beat.id;
          const isRegen = regeneratingBeatId === beat.id;

          return (
            <article
              key={beat.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-4">
                {/* Beat header — clean unboxed metadata */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-semibold text-blue-600 tabular-nums">
                      {beat.timeRange}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <h2 className="font-display font-bold text-slate-900">
                      {beat.label}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingBeatId(isEditing ? null : beat.id)
                      }
                      className="min-h-[44px] px-3 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {isEditing ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                          Done
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRegenerateBeat(beatIndex)}
                      disabled={isRegen || regeneratingAll}
                      className="min-h-[44px] px-3 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {isRegen ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Regenerate
                    </button>
                  </div>
                </div>

                {/* Scene Direction */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-500">Scene</p>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={beat.scene}
                      onChange={(e) =>
                        handleUpdateBeatScene(beat.id, e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {beat.scene}
                    </p>
                  )}
                </div>

                {/* Lines & Subtitles */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500">
                    Lines & Subtitles
                  </p>

                  {isEditing ? (
                    <div className="space-y-2.5">
                      {beat.lines.map((line) => (
                        <div
                          key={line.id}
                          className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
                        >
                          <select
                            value={line.speaker}
                            onChange={(e) =>
                              handleUpdateLine(
                                beat.id,
                                line.id,
                                'speaker',
                                e.target.value
                              )
                            }
                            aria-label="Speaker"
                            className="min-h-[44px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          >
                            <option value="Jennie">Jennie</option>
                            <option value="Mike">Mike</option>
                          </select>

                          <input
                            type="text"
                            value={line.text}
                            onChange={(e) =>
                              handleUpdateLine(
                                beat.id,
                                line.id,
                                'text',
                                e.target.value
                              )
                            }
                            className="flex-1 min-h-[44px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />

                          {beat.lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(beat.id, line.id)}
                              aria-label="Delete line"
                              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddLine(beat.id)}
                        className="min-h-[40px] px-3 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Line
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {beat.lines.map((line) => (
                        <p
                          key={line.id}
                          className="text-sm sm:text-base text-slate-900 leading-relaxed"
                        >
                          <span
                            className={`font-semibold mr-1.5 ${
                              line.speaker.toLowerCase().includes('jennie')
                                ? 'text-amber-700'
                                : 'text-blue-700'
                            }`}
                          >
                            {line.speaker}:
                          </span>
                          <HighlightedSpeech
                            text={line.text}
                            expressions={expressions}
                          />
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Scene
        </button>

        <button
          type="button"
          onClick={onNext}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Next: Generate 30s Video
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
