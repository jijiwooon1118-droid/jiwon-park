export type StudioStep = 'input' | 'scene' | 'storyboard' | 'video' | 'final';

export type VisualStyle = 'live-action' | '2d' | 'clay' | 'watercolor';

export interface ExpressionItem {
  id: string;
  expression: string;
  meaning: string;
  movie: string;
}

export interface SceneConfig {
  place: string;
  characters: string;
  situation: string;
  style: VisualStyle;
}

export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
}

export type BeatId = 'hook' | 'problem' | 'turn' | 'close';

export interface StoryboardBeat {
  id: BeatId;
  label: string;
  timeRange: string;
  startSec: number;
  endSec: number;
  scene: string;
  lines: DialogueLine[];
}

export interface RenderedLineAudio {
  id: string;
  beatId: BeatId;
  speaker: string;
  text: string;
  audioBase64: string;
  mimeType: string;
  durationSec: number;
  startSec: number;
  endSec: number;
}

export interface StyleOption {
  id: VisualStyle;
  label: string;
  shortLabel: string;
  description: string;
  previewImage: string;
}
