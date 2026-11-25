import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

interface ExpressionInput {
  expression: string;
  meaning: string;
  movie: string;
}

interface SceneInput {
  place: string;
  characters: string;
  situation: string;
  style: string;
}

interface DialogueLineInput {
  id?: string;
  speaker: string;
  text: string;
}

interface BeatInput {
  id: string;
  label: string;
  timeRange: string;
  startSec: number;
  endSec: number;
  scene: string;
  lines: DialogueLineInput[];
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getGenAIBetaClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (status && status >= 400 && status < 429 && status !== 408) {
        throw err;
      }
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 600 * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

function formatApiError(err: unknown): { status: number; message: string } {
  const e = err as { status?: number; message?: string };
  const status = typeof e?.status === 'number' ? e.status : 500;
  const raw = e?.message || 'Unexpected Gemini API error.';

  if (status === 403 || raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'API key error. Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (status === 429 || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Rate limit reached. Please wait a moment and try again.',
    };
  }
  return { status, message: raw };
}

// In-memory TTS cache keyed by `${speaker}::${voiceName}::${style}::${text}`
const ttsCache = new Map<string, { audioBase64: string; mimeType: string }>();

function pickVoiceForSpeaker(speaker: string, lineText: string): {
  voiceName: string;
  styleHint: string;
} {
  const lower = speaker.trim().toLowerCase();
  const isFemale =
    lower.includes('jennie') ||
    lower.includes('jenny') ||
    lower.includes('sarah') ||
    lower.includes('emma') ||
    lower.includes('minji') ||
    lower.includes('suzy') ||
    lower.includes('hana');

  const hasExclaim = lineText.includes('!');
  const hasPanic =
    /whoops|freak|pigeon|chaotic|run|tempting|missed/i.test(lineText);

  if (isFemale) {
    return {
      voiceName: 'Kore',
      styleHint: hasPanic
        ? 'Expressive, panicked yet comedic young woman in a sitcom'
        : 'Warm, natural young woman speaking clear everyday English',
    };
  }
  return {
    voiceName: 'Puck',
    styleHint: hasExclaim
      ? 'Confident, energetic, playful young man in a sitcom'
      : 'Warm, upbeat young man speaking clear everyday English',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/storyboard/regenerate-beat', async (req, res) => {
    try {
      const { beatIndex, beats, expressions, scene } = req.body as {
        beatIndex: number;
        beats: BeatInput[];
        expressions: ExpressionInput[];
        scene: SceneInput;
      };

      if (
        typeof beatIndex !== 'number' ||
        !Array.isArray(beats) ||
        beatIndex < 0 ||
        beatIndex >= beats.length
      ) {
        res.status(400).json({ error: 'Invalid beatIndex or beats payload.' });
        return;
      }

      const targetBeat = beats[beatIndex];
      const ai = getGenAIClient();

      const prompt = `You are a friendly short-film comedy writer creating a 30-second English learning sitcom clip for Korean university students.

Regenerate ONLY Beat ${beatIndex + 1} (${targetBeat.timeRange} - ${targetBeat.label}) so it feels fresh, funny, and fits seamlessly with the other beats.

Scene context:
- Place: ${scene.place}
- Characters: ${scene.characters}
- Situation: ${scene.situation}
- Visual Style: ${scene.style}

Target English expressions (use 1 or 2 relevant expressions verbatim, exact spelling):
${expressions.map((e, idx) => `${idx + 1}. "${e.expression}" (${e.meaning} — from ${e.movie})`).join('\n')}

Full 4-beat storyboard for continuity:
${beats
  .map(
    (b, idx) =>
      `Beat ${idx + 1} (${b.timeRange} ${b.label})${idx === beatIndex ? ' [REGENERATE THIS ONE]' : ''}:
Scene: ${b.scene}
Lines: ${b.lines.map((l) => `${l.speaker}: ${l.text}`).join(' / ')}`
  )
  .join('\n\n')}

Rules:
- Keep the spoken words for this beat natural, conversational, and ~10-18 words total so it fits comfortably in ${targetBeat.endSec - targetBeat.startSec} seconds.
- Include at least 1 target expression verbatim (exact spelling).
- Keep speaker names consistent with the characters (e.g. Jennie, Mike).
- Scene visual description should be 1-2 crisp sentences.`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                scene: {
                  type: Type.STRING,
                  description: 'Concise visual direction for this beat (1-2 sentences).',
                },
                lines: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING },
                      text: { type: Type.STRING },
                    },
                    required: ['speaker', 'text'],
                  },
                },
              },
              required: ['scene', 'lines'],
            },
          },
        })
      );

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        scene: string;
        lines: Array<{ speaker: string; text: string }>;
      };

      res.json({
        beat: {
          ...targetBeat,
          scene: parsed.scene,
          lines: (parsed.lines || []).map((l, idx) => ({
            id: `${targetBeat.id}-l${idx + 1}-${Date.now()}`,
            speaker: l.speaker,
            text: l.text,
          })),
        },
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/storyboard/generate-all', async (req, res) => {
    try {
      const { expressions, scene } = req.body as {
        expressions: ExpressionInput[];
        scene: SceneInput;
      };

      if (!Array.isArray(expressions) || expressions.length === 0) {
        res.status(400).json({ error: 'At least one expression is required.' });
        return;
      }

      const ai = getGenAIClient();
      const prompt = `You are a friendly short-film sitcom writer for Korean university students learning everyday English.
Write a 30-second 4-beat animated sitcom script that naturally uses ALL of the target English expressions verbatim (exact spelling).

Scene setup:
- Place: ${scene.place}
- Characters: ${scene.characters}
- Situation: ${scene.situation}
- Visual Style: ${scene.style}

Target English expressions (EVERY ONE must appear verbatim in the spoken lines):
${expressions.map((e, i) => `${i + 1}. "${e.expression}" (${e.meaning} — ${e.movie})`).join('\n')}

Structure into exactly 4 beats:
1. id: "hook", label: "Hook", timeRange: "0-7s", startSec: 0, endSec: 7
2. id: "problem", label: "Problem", timeRange: "7-15s", startSec: 7, endSec: 15
3. id: "turn", label: "Turn", timeRange: "15-23s", startSec: 15, endSec: 23
4. id: "close", label: "Close", timeRange: "23-30s", startSec: 23, endSec: 30

Total spoken word count across all 4 beats must be ~55-70 words so everything fits naturally in 30 seconds at a natural speaking pace.`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  timeRange: { type: Type.STRING },
                  startSec: { type: Type.NUMBER },
                  endSec: { type: Type.NUMBER },
                  scene: { type: Type.STRING },
                  lines: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        speaker: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['speaker', 'text'],
                    },
                  },
                },
                required: ['id', 'label', 'timeRange', 'startSec', 'endSec', 'scene', 'lines'],
              },
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '[]').trim()) as Array<{
        id: string;
        label: string;
        timeRange: string;
        startSec: number;
        endSec: number;
        scene: string;
        lines: Array<{ speaker: string; text: string }>;
      }>;

      const normalized = parsed.slice(0, 4).map((b, bIdx) => ({
        id: (['hook', 'problem', 'turn', 'close'][bIdx] ?? b.id) as BeatInput['id'],
        label: ['Hook', 'Problem', 'Turn', 'Close'][bIdx] ?? b.label,
        timeRange: ['0-7s', '7-15s', '15-23s', '23-30s'][bIdx] ?? b.timeRange,
        startSec: [0, 7, 15, 23][bIdx] ?? b.startSec,
        endSec: [7, 15, 23, 30][bIdx] ?? b.endSec,
        scene: b.scene,
        lines: (b.lines || []).map((l, lIdx) => ({
          id: `b${bIdx + 1}-l${lIdx + 1}-${Date.now()}`,
          speaker: l.speaker,
          text: l.text,
        })),
      }));

      res.json({ beats: normalized });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const { lines } = req.body as {
        lines: Array<{ id: string; beatId: string; speaker: string; text: string }>;
      };

      if (!Array.isArray(lines) || lines.length === 0) {
        res.status(400).json({ error: 'Dialogue lines are required.' });
        return;
      }

      const ai = getGenAIBetaClient();

      const results = await Promise.all(
        lines.map(async (line) => {
          const cleanText = line.text.trim();
          const { voiceName, styleHint } = pickVoiceForSpeaker(line.speaker, cleanText);
          const cacheKey = `${line.speaker}::${voiceName}::${cleanText}`;

          const cached = ttsCache.get(cacheKey);
          if (cached) {
            return {
              id: line.id,
              beatId: line.beatId,
              speaker: line.speaker,
              text: cleanText,
              audioBase64: cached.audioBase64,
              mimeType: cached.mimeType,
            };
          }

          const interaction = await withRetry(() =>
            ai.interactions.create({
              model: 'gemini-3.8-flash-tts',
              input: [
                {
                  type: 'text',
                  text: cleanText,
                  annotations: [
                    {
                      type: 'speech_metadata',
                      style: styleHint,
                    },
                  ],
                },
              ],
              response_format: { type: 'audio' },
              generation_config: {
                speech_config: [
                  {
                    language: 'en-US',
                    voice: voiceName,
                  },
                ],
              },
            })
          );

          const audioOut = interaction.output_audio;
          const base64Audio = audioOut?.data;
          const mimeType = audioOut?.mime_type ?? 'audio/wav';

          if (!base64Audio) {
            throw new Error(`No audio returned for line: "${cleanText}"`);
          }

          ttsCache.set(cacheKey, { audioBase64: base64Audio, mimeType });

          return {
            id: line.id,
            beatId: line.beatId,
            speaker: line.speaker,
            text: cleanText,
            audioBase64: base64Audio,
            mimeType,
          };
        })
      );

      res.json({ clips: results });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`wow studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
