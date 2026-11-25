import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookText,
  Clapperboard,
  Film,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { FinalScreen } from './components/FinalScreen';
import { InputScreen } from './components/InputScreen';
import { SceneScreen } from './components/SceneScreen';
import { StoryboardScreen } from './components/StoryboardScreen';
import { VideoScreen } from './components/VideoScreen';
import {
  DEFAULT_BEATS,
  DEFAULT_EXPRESSIONS,
  DEFAULT_SCENE,
} from './data/defaults';
import {
  generateAndScheduleAudio,
  type ScheduledAudioLine,
} from './lib/audioEngine';
import type {
  ExpressionItem,
  SceneConfig,
  StoryboardBeat,
  StudioStep,
} from './types';

const STEPS: Array<{
  id: StudioStep;
  label: string;
  shortLabel: string;
}> = [
  { id: 'input', label: '1. Input', shortLabel: 'Input' },
  { id: 'scene', label: '2. Scene', shortLabel: 'Scene' },
  { id: 'storyboard', label: '3. Storyboard', shortLabel: 'Board' },
  { id: 'video', label: '4. Video', shortLabel: 'Video' },
  { id: 'final', label: '5. Final', shortLabel: 'Final' },
];

export default function App() {
  const [step, setStep] = useState<StudioStep>('input');
  const [expressions, setExpressions] = useState<ExpressionItem[]>(
    () => DEFAULT_EXPRESSIONS
  );
  const [scene, setScene] = useState<SceneConfig>(() => DEFAULT_SCENE);
  const [beats, setBeats] = useState<StoryboardBeat[]>(() => DEFAULT_BEATS);

  const [scheduledLines, setScheduledLines] = useState<ScheduledAudioLine[]>(
    []
  );
  const [generatedScriptKey, setGeneratedScriptKey] = useState<string | null>(
    null
  );
  const [isGeneratingVoices, setIsGeneratingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null);

  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      setAudioCtx(ctx);
    }
    return audioCtxRef.current;
  }, []);

  const currentScriptKey = useMemo(
    () =>
      JSON.stringify(
        beats.map((b) => ({
          id: b.id,
          lines: b.lines.map((l) => ({
            id: l.id,
            speaker: l.speaker,
            text: l.text,
          })),
        }))
      ),
    [beats]
  );

  const voicesReady =
    generatedScriptKey === currentScriptKey && scheduledLines.length > 0;

  // Clear cached export blob when visual style or script changes
  useEffect(() => {
    setExportedBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [currentScriptKey, scene.style]);

  const handleGenerateVoices = useCallback(async () => {
    setIsGeneratingVoices(true);
    setVoiceError(null);
    try {
      const ctx = getAudioContext();
      const { scheduledLines: lines } = await generateAndScheduleAudio(
        beats,
        ctx
      );
      setScheduledLines(lines);
      setGeneratedScriptKey(currentScriptKey);
    } catch (err) {
      setVoiceError(
        err instanceof Error
          ? err.message
          : 'Failed to generate English voice tracks.'
      );
    } finally {
      setIsGeneratingVoices(false);
    }
  }, [beats, currentScriptKey, getAudioContext]);

  // Auto-generate English TTS voices when entering Video or Final step
  useEffect(() => {
    if (
      (step === 'video' || step === 'final') &&
      generatedScriptKey !== currentScriptKey &&
      !isGeneratingVoices &&
      !voiceError
    ) {
      void handleGenerateVoices();
    }
  }, [
    step,
    generatedScriptKey,
    currentScriptKey,
    isGeneratingVoices,
    voiceError,
    handleGenerateVoices,
  ]);

  const goToStep = (next: StudioStep) => {
    setVoiceError(null);
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTopAction = () => {
    const order: StudioStep[] = [
      'input',
      'scene',
      'storyboard',
      'video',
      'final',
    ];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) {
      goToStep(order[idx + 1]);
    } else {
      goToStep('input');
    }
  };

  const topActionLabel =
    step === 'final' ? 'New Clip' : 'Next Step';

  const renderMobileIcon = (id: StudioStep) => {
    switch (id) {
      case 'input':
        return <BookText className="w-5 h-5" />;
      case 'scene':
        return <Clapperboard className="w-5 h-5" />;
      case 'storyboard':
        return <LayoutGrid className="w-5 h-5" />;
      case 'video':
        return <Film className="w-5 h-5" />;
      case 'final':
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8fa] text-slate-900">
      {/* Three-Zone Top Bar (<= 52px on mobile) */}
      <header className="sticky top-0 z-30 h-[52px] md:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => goToStep('input')}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
        >
          wow
        </button>

        <nav
          aria-label="Studio steps"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {STEPS.map((s) => {
            const active = step === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(s.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'text-blue-600 font-semibold underline decoration-2 underline-offset-8'
                    : 'text-slate-600 hover:text-slate-900 hover:underline underline-offset-8'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleTopAction}
            className="min-h-[36px] md:min-h-[40px] px-3.5 md:px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {topActionLabel}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-12">
        {step === 'input' && (
          <InputScreen
            expressions={expressions}
            onChange={setExpressions}
            onResetDefaults={() => setExpressions(DEFAULT_EXPRESSIONS)}
            onNext={() => goToStep('scene')}
          />
        )}

        {step === 'scene' && (
          <SceneScreen
            scene={scene}
            onChange={setScene}
            onBack={() => goToStep('input')}
            onNext={() => goToStep('storyboard')}
          />
        )}

        {step === 'storyboard' && (
          <StoryboardScreen
            beats={beats}
            expressions={expressions}
            scene={scene}
            onChangeBeats={setBeats}
            onResetScript={() => setBeats(DEFAULT_BEATS)}
            onBack={() => goToStep('scene')}
            onNext={() => goToStep('video')}
          />
        )}

        {step === 'video' && (
          <VideoScreen
            beats={beats}
            scene={scene}
            scheduledLines={scheduledLines}
            audioCtx={audioCtx}
            isGeneratingVoices={isGeneratingVoices}
            voiceError={voiceError}
            voicesReady={voicesReady}
            onGenerateVoices={() => {
              void handleGenerateVoices();
            }}
            onBack={() => goToStep('storyboard')}
            onNext={() => goToStep('final')}
          />
        )}

        {step === 'final' && (
          <FinalScreen
            expressions={expressions}
            beats={beats}
            scene={scene}
            scheduledLines={scheduledLines}
            audioCtx={audioCtx}
            exportedBlobUrl={exportedBlobUrl}
            onExportComplete={setExportedBlobUrl}
            onBack={() => goToStep('video')}
            onStartOver={() => goToStep('input')}
          />
        )}
      </main>

      {/* Mobile Bottom 5-Step Thumb Dock (<= 56px, keeps total sticky chrome < 15% of 812px viewport) */}
      <nav
        aria-label="Mobile step navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-14">
          {STEPS.map((s) => {
            const active = step === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(s.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                  active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {renderMobileIcon(s.id)}
                <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                  {s.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
