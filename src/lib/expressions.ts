import type { ExpressionItem, StoryboardBeat } from '../types';

export interface ExpressionValidation {
  validCount: boolean;
  validMovieVariety: boolean;
  expressionCount: number;
  uniqueMovieCount: number;
  warnings: string[];
}

export function validateExpressions(items: ExpressionItem[]): ExpressionValidation {
  const nonEmpty = items.filter((i) => i.expression.trim().length > 0);
  const movies = new Set(
    nonEmpty
      .map((i) => i.movie.trim().toLowerCase())
      .filter((m) => m.length > 0)
  );

  const validCount = nonEmpty.length >= 5;
  const validMovieVariety = movies.size >= 2;

  const warnings: string[] = [];
  if (!validCount) {
    warnings.push(
      `Add at least ${5 - nonEmpty.length} more expression${5 - nonEmpty.length === 1 ? '' : 's'} (minimum 5 expressions required).`
    );
  }
  if (!validMovieVariety) {
    warnings.push(
      'Include expressions from at least 2 different movies (currently only 1 movie).'
    );
  }

  return {
    validCount,
    validMovieVariety,
    expressionCount: nonEmpty.length,
    uniqueMovieCount: movies.size,
    warnings,
  };
}

export function countSpokenWords(beats: StoryboardBeat[]): number {
  let count = 0;
  for (const beat of beats) {
    for (const line of beat.lines) {
      const words = line.text
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      count += words.length;
    }
  }
  return count;
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
  matchedExpression?: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findHighlightSegments(
  text: string,
  expressions: ExpressionItem[]
): TextSegment[] {
  const cleanTargets = expressions
    .map((e) => e.expression.trim())
    .filter((e) => e.length > 0);

  if (cleanTargets.length === 0 || !text) {
    return [{ text, highlighted: false }];
  }

  // Build candidate patterns: exact typed expression + punctuation-trimmed base (e.g. "Whoopsadaisies!" -> also "whoopsadaisies")
  const patternParts: string[] = [];
  const seen = new Set<string>();

  const sorted = [...cleanTargets].sort((a, b) => b.length - a.length);
  for (const expr of sorted) {
    const lower = expr.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      patternParts.push(escapeRegExp(expr));
    }
    const trimmedPunct = expr.replace(/[!?.]+$/, '').trim();
    if (trimmedPunct && trimmedPunct.toLowerCase() !== lower && !seen.has(trimmedPunct.toLowerCase())) {
      seen.add(trimmedPunct.toLowerCase());
      patternParts.push(`\\b${escapeRegExp(trimmedPunct)}\\b`);
    }
  }

  if (patternParts.length === 0) {
    return [{ text, highlighted: false }];
  }

  const regex = new RegExp(`(${patternParts.join('|')})`, 'gi');
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        highlighted: false,
      });
    }
    segments.push({
      text: match[0],
      highlighted: true,
      matchedExpression: match[0],
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      highlighted: false,
    });
  }

  return segments.length > 0 ? segments : [{ text, highlighted: false }];
}
