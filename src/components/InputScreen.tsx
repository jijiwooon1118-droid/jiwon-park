import { AlertTriangle, ArrowRight, Film, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { validateExpressions } from '../lib/expressions';
import type { ExpressionItem } from '../types';

interface InputScreenProps {
  expressions: ExpressionItem[];
  onChange: (next: ExpressionItem[]) => void;
  onResetDefaults: () => void;
  onNext: () => void;
}

export function InputScreen({
  expressions,
  onChange,
  onResetDefaults,
  onNext,
}: InputScreenProps) {
  const validation = validateExpressions(expressions);

  const handleUpdate = (
    id: string,
    field: keyof Omit<ExpressionItem, 'id'>,
    value: string
  ) => {
    onChange(
      expressions.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAdd = () => {
    onChange([
      ...expressions,
      {
        id: `exp-${Date.now()}`,
        expression: '',
        meaning: '',
        movie: '',
      },
    ]);
  };

  const handleDelete = (id: string) => {
    onChange(expressions.filter((item) => item.id !== id));
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-blue-600">Step 1 of 5</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            Movie expressions to learn
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
            Collect at least 5 expressions from 2 or more movies. We will weave them into a 30-second sitcom clip.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0 tabular-nums">
          <span>{validation.expressionCount} expressions</span>
          <span aria-hidden="true">·</span>
          <span>
            {validation.uniqueMovieCount}{' '}
            {validation.uniqueMovieCount === 1 ? 'movie' : 'movies'}
          </span>
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {validation.warnings.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-amber-950"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold">Check your expression list</p>
            <ul className="space-y-0.5 text-amber-900">
              {validation.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {expressions.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-slate-600">No expressions yet. Add your first movie expression below.</p>
          </div>
        ) : (
          expressions.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start"
            >
              <div className="md:col-span-4 space-y-1">
                <label
                  htmlFor={`expr-${item.id}`}
                  className="block text-xs font-medium text-slate-500"
                >
                  {String(idx + 1).padStart(2, '0')}. English expression
                </label>
                <input
                  id={`expr-${item.id}`}
                  type="text"
                  value={item.expression}
                  onChange={(e) => handleUpdate(item.id, 'expression', e.target.value)}
                  placeholder="e.g. Whoopsadaisies!"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label
                  htmlFor={`mean-${item.id}`}
                  className="block text-xs font-medium text-slate-500"
                >
                  Korean meaning
                </label>
                <input
                  id={`mean-${item.id}`}
                  type="text"
                  value={item.meaning}
                  onChange={(e) => handleUpdate(item.id, 'meaning', e.target.value)}
                  placeholder="e.g. 아이쿠, 이런!"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label
                  htmlFor={`movie-${item.id}`}
                  className="block text-xs font-medium text-slate-500"
                >
                  Movie
                </label>
                <div className="relative">
                  <Film className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id={`movie-${item.id}`}
                    type="text"
                    value={item.movie}
                    onChange={(e) => handleUpdate(item.id, 'movie', e.target.value)}
                    placeholder="e.g. Notting Hill"
                    className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <div className="md:col-span-1 flex justify-end md:pt-5">
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  aria-label={`Remove ${item.expression || 'expression'}`}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleAdd}
          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Expression
        </button>

        <button
          type="button"
          onClick={onNext}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Next: Set the Scene
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
