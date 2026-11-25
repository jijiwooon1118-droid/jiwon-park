import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clapperboard } from 'lucide-react';
import { STYLE_OPTIONS } from '../data/defaults';
import type { SceneConfig, VisualStyle } from '../types';

interface SceneScreenProps {
  scene: SceneConfig;
  onChange: (next: SceneConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SceneScreen({
  scene,
  onChange,
  onBack,
  onNext,
}: SceneScreenProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const updateField = <K extends keyof SceneConfig>(
    key: K,
    value: SceneConfig[K]
  ) => {
    onChange({ ...scene, [key]: value });
  };

  return (
    <section className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-blue-600">Step 2 of 5</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
          Design your 30-second sitcom scene
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
          Customize the setting, cast, and visual style. Consistent characters and outfits carry across all 4 beats.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Scene details */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="scene-place"
              className="block text-sm font-semibold text-slate-900"
            >
              Place
            </label>
            <textarea
              id="scene-place"
              rows={2}
              value={scene.place}
              onChange={(e) => updateField('place', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="scene-characters"
              className="block text-sm font-semibold text-slate-900"
            >
              Characters
            </label>
            <textarea
              id="scene-characters"
              rows={3}
              value={scene.characters}
              onChange={(e) => updateField('characters', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="scene-situation"
              className="block text-sm font-semibold text-slate-900"
            >
              Situation
            </label>
            <textarea
              id="scene-situation"
              rows={3}
              value={scene.situation}
              onChange={(e) => updateField('situation', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Right: Style Menu */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Visual Style</h2>
            <span className="text-xs text-slate-500">4 animation styles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {STYLE_OPTIONS.map((option) => {
              const selected = scene.style === option.id;
              const imgFailed = failedImages[option.id];

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateField('style', option.id as VisualStyle)}
                  aria-pressed={selected}
                  className={`group text-left rounded-2xl border overflow-hidden transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    selected
                      ? 'border-blue-600 bg-white ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                    {!imgFailed ? (
                      <img
                        src={option.previewImage}
                        alt={`${option.label} preview`}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({
                            ...prev,
                            [option.id]: true,
                          }))
                        }
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-slate-100 text-slate-500 p-4">
                        <Clapperboard className="w-6 h-6" />
                        <span className="text-xs font-medium">{option.shortLabel}</span>
                      </div>
                    )}
                    {selected && (
                      <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {option.label}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
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
          Back to Expressions
        </button>

        <button
          type="button"
          onClick={onNext}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Next: Open Storyboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
