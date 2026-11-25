import type {
  ExpressionItem,
  SceneConfig,
  StoryboardBeat,
  StyleOption,
} from '../types';

export const DEFAULT_EXPRESSIONS: ExpressionItem[] = [
  {
    id: 'exp-1',
    expression: 'Whoopsadaisies!',
    meaning: '아이쿠, 이런!',
    movie: 'Notting Hill',
  },
  {
    id: 'exp-2',
    expression: 'freaked out',
    meaning: '기겁하다, 패닉에 빠지다',
    movie: 'Inside Out 2',
  },
  {
    id: 'exp-3',
    expression: 'Hold the fort',
    meaning: '잠시 자리를 지키다',
    movie: 'Notting Hill',
  },
  {
    id: 'exp-4',
    expression: 'tempting',
    meaning: '구미가 당기는, 솔깃한',
    movie: 'Notting Hill',
  },
  {
    id: 'exp-5',
    expression: "I'm confident that",
    meaning: '~라고 확신하다',
    movie: 'Notting Hill',
  },
];

export const DEFAULT_SCENE: SceneConfig = {
  place: 'A bright, cozy living room with an open window and scattered papers.',
  characters:
    'Jennie (wearing a yellow cardigan and jeans, panicked at first) and Mike (wearing a blue button-up shirt with rolled-up sleeves, confident and energetic).',
  situation:
    'A pigeon suddenly flies into the living room, causing chaos until Mike catches it with a towel.',
  style: 'live-action',
};

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'live-action',
    label: 'Live-action sitcom comedy style',
    shortLabel: 'Live-action',
    description: 'Warm indoor studio lighting, multi-cam sitcom framing, crisp natural tones.',
    previewImage: '/src/assets/images/style_live_action_1795579661645.jpg',
  },
  {
    id: '2d',
    label: '2D animation',
    shortLabel: '2D animation',
    description: 'Clean expressive ink outlines, cel-shaded warmth, snappy comic reactions.',
    previewImage: '/src/assets/images/style_2d_animation_1795579662422.jpg',
  },
  {
    id: 'clay',
    label: 'Clay',
    shortLabel: 'Clay',
    description: 'Tactile miniature stop-motion look with sculpted surfaces and 12fps cadence.',
    previewImage: '/src/assets/images/style_claymation_1795579663966.jpg',
  },
  {
    id: 'watercolor',
    label: 'Watercolor',
    shortLabel: 'Watercolor',
    description: 'Hand-painted translucent washes on textured paper with soft ink contours.',
    previewImage: '/src/assets/images/style_watercolor_1795579662926.jpg',
  },
];

export const DEFAULT_BEATS: StoryboardBeat[] = [
  {
    id: 'hook',
    label: 'Hook',
    timeRange: '0-7s',
    startSec: 0,
    endSec: 7,
    scene:
      'A pigeon flies into a bright living room through an open window. Jennie looks shocked as papers scatter. Sitcom comedy style.',
    lines: [
      {
        id: 'b1-l1',
        speaker: 'Jennie',
        text: 'Whoopsadaisies! A pigeon just flew into the room!',
      },
    ],
  },
  {
    id: 'problem',
    label: 'Problem',
    timeRange: '7-15s',
    startSec: 7,
    endSec: 15,
    scene:
      'Panicked Jennie steps back while confident Mike walks in, rolling up his sleeves. Bright indoor lighting.',
    lines: [
      {
        id: 'b2-l1',
        speaker: 'Mike',
        text: 'What came over it?! It’s chaotic in here!',
      },
      {
        id: 'b2-l2',
        speaker: 'Jennie',
        text: 'I was going to catch it, but I freaked out.',
      },
    ],
  },
  {
    id: 'turn',
    label: 'Turn',
    timeRange: '15-23s',
    startSec: 15,
    endSec: 23,
    scene:
      'Mike grabs a towel and chases the flying pigeon while Jennie hides near the window, peeking out.',
    lines: [
      {
        id: 'b3-l1',
        speaker: 'Mike',
        text: 'Hold the fort by the window. Let me grab a towel!',
      },
      {
        id: 'b3-l2',
        speaker: 'Jennie',
        text: 'It’s tempting to run, though!',
      },
    ],
  },
  {
    id: 'close',
    label: 'Close',
    timeRange: '23-30s',
    startSec: 23,
    endSec: 30,
    scene:
      'Mike swings a towel, misses comically, then quickly catches the pigeon and smiles proudly.',
    lines: [
      {
        id: 'b4-l1',
        speaker: 'Mike',
        text: "I'm confident that I’ve got it... whoopsadaisies, missed! Aha, caught the pigeon!",
      },
    ],
  },
];
