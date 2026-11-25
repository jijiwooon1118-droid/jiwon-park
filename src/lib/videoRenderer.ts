import type { BeatId, SceneConfig, StoryboardBeat, VisualStyle } from '../types';

export interface ActiveSubtitle {
  speaker: string;
  text: string;
  progress: number; // 0..1 within this line
}

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeSec: number; // 0..30
  beats: StoryboardBeat[];
  scene: SceneConfig;
  activeSubtitle: ActiveSubtitle | null;
  totalDurationSec?: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return 1 - Math.pow(1 - c, 3);
}

function easeInOutQuad(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

function getBeatAtTime(
  timeSec: number,
  beats: StoryboardBeat[]
): { beat: StoryboardBeat; beatIndex: number; localT: number } {
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    if (timeSec >= b.startSec && (timeSec < b.endSec || i === beats.length - 1)) {
      const dur = Math.max(0.1, b.endSec - b.startSec);
      return {
        beat: b,
        beatIndex: i,
        localT: clamp((timeSec - b.startSec) / dur, 0, 1),
      };
    }
  }
  const fallback = beats[0];
  return { beat: fallback, beatIndex: 0, localT: 0 };
}

function wrapSubtitleLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
        current = word;
      } else {
        lines.push(word);
        current = '';
      }
      if (lines.length === 2) {
        // Append remaining words to line 2 with ellipsis only if overflowed
        const rest = words.slice(i + 1).join(' ');
        if (rest) {
          lines[1] = `${lines[1]} ${rest}`;
        }
        return lines;
      }
    }
  }
  if (current) {
    lines.push(current);
  }
  if (lines.length > 2) {
    return [lines[0], lines.slice(1).join(' ')];
  }
  return lines;
}

interface Palette {
  wallTop: string;
  wallBottom: string;
  floorTop: string;
  floorBottom: string;
  trim: string;
  sofa: string;
  sofaShade: string;
  curtain: string;
  skyTop: string;
  skyBottom: string;
  outline: string | null;
  outlineWidth: number;
  jennieCardigan: string;
  jennieCardiganShade: string;
  jennieJeans: string;
  mikeShirt: string;
  mikeShirtShade: string;
  mikePants: string;
  skin: string;
  skinShade: string;
  hair: string;
}

function getStylePalette(style: VisualStyle): Palette {
  switch (style) {
    case '2d':
      return {
        wallTop: '#FEF3C7',
        wallBottom: '#FDE68A',
        floorTop: '#D97706',
        floorBottom: '#B45309',
        trim: '#FFFBEB',
        sofa: '#EA580C',
        sofaShade: '#C2410C',
        curtain: '#FFFFFF',
        skyTop: '#60A5FA',
        skyBottom: '#BAE6FD',
        outline: '#1E293B',
        outlineWidth: 3.2,
        jennieCardigan: '#FACC15',
        jennieCardiganShade: '#CA8A04',
        jennieJeans: '#2563EB',
        mikeShirt: '#3B82F6',
        mikeShirtShade: '#1D4ED8',
        mikePants: '#334155',
        skin: '#FCD5B5',
        skinShade: '#F1B48A',
        hair: '#292524',
      };
    case 'clay':
      return {
        wallTop: '#F5E6CA',
        wallBottom: '#EBD5B3',
        floorTop: '#B57C4A',
        floorBottom: '#8F5D34',
        trim: '#FAF3E7',
        sofa: '#E07A5F',
        sofaShade: '#C05A40',
        curtain: '#FDFBF7',
        skyTop: '#7CC6FE',
        skyBottom: '#CBEAFF',
        outline: null,
        outlineWidth: 0,
        jennieCardigan: '#F4C430',
        jennieCardiganShade: '#D49E12',
        jennieJeans: '#486581',
        mikeShirt: '#4A8FE7',
        mikeShirtShade: '#2F6EC2',
        mikePants: '#3E4C59',
        skin: '#F5C6A5',
        skinShade: '#DDA17A',
        hair: '#3D2B1F',
      };
    case 'watercolor':
      return {
        wallTop: '#F9F4EE',
        wallBottom: '#EFE4D8',
        floorTop: '#DFC5A4',
        floorBottom: '#C9A882',
        trim: '#FFFDF9',
        sofa: '#D48C70',
        sofaShade: '#B86E54',
        curtain: '#FAF6F0',
        skyTop: '#93C5FD',
        skyBottom: '#E0F2FE',
        outline: '#4A3F35',
        outlineWidth: 1.6,
        jennieCardigan: '#F3CA40',
        jennieCardiganShade: '#D9A726',
        jennieJeans: '#4B6B94',
        mikeShirt: '#5B9BD5',
        mikeShirtShade: '#3A74B0',
        mikePants: '#475569',
        skin: '#F8D4BA',
        skinShade: '#E6B392',
        hair: '#3B2F2F',
      };
    case 'live-action':
    default:
      return {
        wallTop: '#E6EAE2',
        wallBottom: '#D3D9CE',
        floorTop: '#C59B6D',
        floorBottom: '#9E7449',
        trim: '#F7F7F2',
        sofa: '#B59E84',
        sofaShade: '#8E7860',
        curtain: '#FAFAFA',
        skyTop: '#7DD3FC',
        skyBottom: '#E0F2FE',
        outline: '#1E293B',
        outlineWidth: 1.4,
        jennieCardigan: '#F4C430',
        jennieCardiganShade: '#CA9A14',
        jennieJeans: '#3B5B8C',
        mikeShirt: '#3B82F6',
        mikeShirtShade: '#2563EB',
        mikePants: '#334155',
        skin: '#F6CBA8',
        skinShade: '#DDA47C',
        hair: '#27201C',
      };
  }
}

function strokeIfOutlined(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  alpha = 1
) {
  if (!pal.outline) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = pal.outlineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawLivingRoom(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  style: VisualStyle,
  t: number,
  beatId: BeatId
) {
  // Wall gradient
  const wallGrad = ctx.createLinearGradient(0, 0, 0, 500);
  wallGrad.addColorStop(0, pal.wallTop);
  wallGrad.addColorStop(1, pal.wallBottom);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, 1280, 500);

  // Watercolor paper wash blobs
  if (style === 'watercolor') {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#FBCFE8';
    ctx.beginPath();
    ctx.ellipse(980, 130, 260, 140, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#BFDBFE';
    ctx.beginPath();
    ctx.ellipse(300, 160, 240, 130, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floor gradient
  const floorGrad = ctx.createLinearGradient(0, 500, 0, 720);
  floorGrad.addColorStop(0, pal.floorTop);
  floorGrad.addColorStop(1, pal.floorBottom);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, 500, 1280, 220);

  // Floor planks
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.09)';
  ctx.lineWidth = 2;
  for (let y = 535; y < 720; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1280, y);
    ctx.stroke();
  }
  ctx.restore();

  // Baseboard trim
  ctx.fillStyle = pal.trim;
  ctx.fillRect(0, 486, 1280, 16);
  if (pal.outline) {
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 486, 1280, 16);
  }

  // Open Window on left (x: 80..360, y: 80..380)
  const skyGrad = ctx.createLinearGradient(80, 80, 80, 380);
  skyGrad.addColorStop(0, pal.skyTop);
  skyGrad.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(80, 80, 280, 300);

  // Fluffy clouds + trees outside window
  ctx.save();
  ctx.beginPath();
  ctx.rect(80, 80, 280, 300);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const cloudDrift = Math.sin(t * 0.25) * 14;
  ctx.beginPath();
  ctx.arc(160 + cloudDrift, 145, 28, 0, Math.PI * 2);
  ctx.arc(192 + cloudDrift, 138, 34, 0, Math.PI * 2);
  ctx.arc(224 + cloudDrift, 148, 25, 0, Math.PI * 2);
  ctx.fill();

  // Green foliage outside
  ctx.fillStyle = style === '2d' ? '#22C55E' : '#4D7C5D';
  ctx.beginPath();
  ctx.arc(130, 355, 72, 0, Math.PI * 2);
  ctx.arc(230, 365, 64, 0, Math.PI * 2);
  ctx.arc(325, 345, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Window frame + open casement sash
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 14;
  ctx.strokeRect(80, 80, 280, 300);
  if (pal.outline) {
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = pal.outlineWidth;
    ctx.strokeRect(73, 73, 294, 314);
    ctx.strokeRect(87, 87, 266, 286);
  }
  // Open casement panel swung inward
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(80, 82);
  ctx.lineTo(148, 102);
  ctx.lineTo(148, 358);
  ctx.lineTo(80, 378);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (pal.outline) {
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();

  // Sunbeam coming through open window (especially warm in live-action)
  ctx.save();
  const beamGrad = ctx.createLinearGradient(80, 120, 660, 560);
  beamGrad.addColorStop(0, 'rgba(255, 251, 214, 0.28)');
  beamGrad.addColorStop(1, 'rgba(255, 251, 214, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(80, 80);
  ctx.lineTo(360, 80);
  ctx.lineTo(740, 560);
  ctx.lineTo(240, 560);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Curtains billowing in the breeze
  const breeze = Math.sin(t * 3.4) * 18 + (beatId === 'hook' ? 14 : 6);
  // Left curtain
  ctx.fillStyle = pal.curtain;
  ctx.beginPath();
  ctx.moveTo(58, 66);
  ctx.quadraticCurveTo(98, 220, 74 + breeze * 0.4, 410);
  ctx.lineTo(44, 410);
  ctx.quadraticCurveTo(50, 220, 48, 66);
  ctx.closePath();
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Right curtain (fluttering inward!)
  ctx.fillStyle = pal.curtain;
  ctx.beginPath();
  ctx.moveTo(350, 66);
  ctx.quadraticCurveTo(385 + breeze, 210, 410 + breeze * 1.4, 395);
  ctx.lineTo(340 + breeze * 0.6, 405);
  ctx.quadraticCurveTo(345, 220, 332, 66);
  ctx.closePath();
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Curtain rod
  ctx.fillStyle = '#78350F';
  drawRoundedRect(ctx, 40, 58, 355, 10, 5);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Framed wall art (right of window)
  const drawFrame = (x: number, y: number, w: number, h: number, accent: string) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(x + 12, y + 12, w - 24, h - 24);
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, w, h);
    if (pal.outline) {
      ctx.strokeStyle = pal.outline;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
    }
  };
  drawFrame(520, 110, 120, 95, '#A7F3D0');
  drawFrame(670, 130, 88, 75, '#FDE68A');

  // Potted houseplant on right
  ctx.fillStyle = '#C2410C';
  ctx.beginPath();
  ctx.moveTo(1110, 435);
  ctx.lineTo(1170, 435);
  ctx.lineTo(1160, 495);
  ctx.lineTo(1120, 495);
  ctx.closePath();
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  ctx.fillStyle = '#15803D';
  const leafSway = Math.sin(t * 2.2) * 4;
  for (const [dx, dy, rot] of [
    [-26, -32, -0.5],
    [0, -48, 0],
    [28, -30, 0.5],
    [-16, -18, -0.8],
    [22, -16, 0.8],
  ]) {
    ctx.save();
    ctx.translate(1140 + dx + leafSway * 0.4, 435 + dy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    strokeIfOutlined(ctx, pal);
    ctx.restore();
  }

  // Cozy Sofa
  ctx.fillStyle = pal.sofaShade;
  drawRoundedRect(ctx, 510, 355, 420, 145, 24);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  ctx.fillStyle = pal.sofa;
  drawRoundedRect(ctx, 530, 370, 380, 95, 20);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Sofa cushions + armrests
  drawRoundedRect(ctx, 495, 415, 48, 95, 16);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  drawRoundedRect(ctx, 898, 415, 48, 95, 16);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Yellow & blue throw pillows matching Jennie & Mike colors!
  ctx.fillStyle = '#FACC15';
  drawRoundedRect(ctx, 558, 392, 54, 52, 12);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  ctx.fillStyle = '#60A5FA';
  drawRoundedRect(ctx, 825, 395, 52, 50, 12);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Coffee table in front
  ctx.fillStyle = '#92400E';
  drawRoundedRect(ctx, 600, 525, 250, 22, 6);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  ctx.fillRect(625, 547, 14, 42);
  ctx.fillRect(812, 547, 14, 42);
}

interface CharacterState {
  x: number;
  y: number;
  scale?: number;
  flipX?: boolean;
  mood: 'shocked' | 'panicked' | 'peeking' | 'confident' | 'swinging' | 'proud' | 'relieved';
  speaking: boolean;
  talkPhase: number;
  hasTowel?: boolean;
  towelAngle?: number;
  rollingSleeves?: boolean;
}

function drawJennie(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  style: VisualStyle,
  state: CharacterState,
  t: number
) {
  ctx.save();
  ctx.translate(state.x, state.y);
  const s = state.scale ?? 1;
  ctx.scale(state.flipX ? -s : s, s);

  const bob = state.mood === 'panicked' || state.mood === 'shocked'
    ? Math.sin(t * 14) * 3
    : Math.sin(t * 3) * 2;
  ctx.translate(0, bob);

  // Ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 152, 44, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Legs (Jeans)
  ctx.fillStyle = pal.jennieJeans;
  drawRoundedRect(ctx, -26, 56, 20, 88, 9);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  drawRoundedRect(ctx, 6, 56, 20, 88, 9);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Sneakers
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, -30, 136, 26, 15, 7);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  drawRoundedRect(ctx, 4, 136, 26, 15, 7);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Back Hair
  ctx.fillStyle = pal.hair;
  drawRoundedRect(ctx, -40, -108, 80, 92, 34);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Torso (Yellow Cardigan over White Tee)
  ctx.fillStyle = pal.jennieCardigan;
  drawRoundedRect(ctx, -36, -34, 72, 96, 22);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // White inner shirt V-neck
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-14, -34);
  ctx.lineTo(14, -34);
  ctx.lineTo(8, 56);
  ctx.lineTo(-8, 56);
  ctx.closePath();
  ctx.fill();
  if (pal.outline) {
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // Cardigan buttons
  ctx.fillStyle = pal.jennieCardiganShade;
  for (const by of [-8, 14, 36]) {
    ctx.beginPath();
    ctx.arc(-13, by, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Arms (Yellow cardigan sleeves)
  const armWave =
    state.mood === 'shocked'
      ? -1.25 + Math.sin(t * 14) * 0.15
      : state.mood === 'panicked'
      ? -0.7 + Math.sin(t * 10) * 0.2
      : state.mood === 'relieved'
      ? -0.9 + Math.sin(t * 8) * 0.15
      : 0.25;

  // Left arm
  ctx.save();
  ctx.translate(-32, -20);
  ctx.rotate(armWave);
  ctx.fillStyle = pal.jennieCardigan;
  drawRoundedRect(ctx, -10, 0, 18, 56, 8);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(-1, 58, 9, 0, Math.PI * 2);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  ctx.restore();

  // Right arm
  ctx.save();
  ctx.translate(32, -20);
  ctx.rotate(-armWave);
  ctx.fillStyle = pal.jennieCardigan;
  drawRoundedRect(ctx, -8, 0, 18, 56, 8);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(1, 58, 9, 0, Math.PI * 2);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  ctx.restore();

  // Neck + Head
  ctx.fillStyle = pal.skinShade;
  drawRoundedRect(ctx, -9, -48, 18, 18, 6);
  ctx.fill();

  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, -76, 33, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Clay highlight
  if (style === 'clay') {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(-10, -90, 10, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Front hair bangs
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.arc(0, -86, 35, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(22, -74, 8, -86);
  ctx.quadraticCurveTo(-8, -72, -35, -84);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Eyes & Brows
  const eyeRadius = state.mood === 'shocked' || state.mood === 'panicked' ? 6.5 : 4.8;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-12, -74, eyeRadius + 2, 0, Math.PI * 2);
  ctx.arc(12, -74, eyeRadius + 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-12, -74, state.mood === 'shocked' ? 3.2 : 4.2, 0, Math.PI * 2);
  ctx.arc(12, -74, state.mood === 'shocked' ? 3.2 : 4.2, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = pal.hair;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (state.mood === 'shocked' || state.mood === 'panicked') {
    ctx.moveTo(-19, -87);
    ctx.lineTo(-6, -91);
    ctx.moveTo(6, -91);
    ctx.lineTo(19, -87);
  } else {
    ctx.moveTo(-19, -86);
    ctx.lineTo(-6, -86);
    ctx.moveTo(6, -86);
    ctx.lineTo(19, -86);
  }
  ctx.stroke();

  // Mouth (lip sync when speaking!)
  const mouthOpen = state.speaking ? 4 + Math.abs(Math.sin(state.talkPhase * 18)) * 7 : 0;
  ctx.fillStyle = '#991B1B';
  ctx.beginPath();
  if (state.speaking) {
    ctx.ellipse(0, -56, 7, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (state.mood === 'shocked' || state.mood === 'panicked') {
    ctx.ellipse(0, -56, 5.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#7C2D12';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -60, 9, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  // Sweat drop in 2D / panic
  if (state.mood === 'panicked' || state.mood === 'peeking') {
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(28, -94);
    ctx.quadraticCurveTo(35, -83, 28, -80);
    ctx.quadraticCurveTo(21, -83, 28, -94);
    ctx.fill();
  }

  ctx.restore();
}

function drawMike(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  style: VisualStyle,
  state: CharacterState,
  t: number
) {
  ctx.save();
  ctx.translate(state.x, state.y);
  const s = state.scale ?? 1;
  ctx.scale(state.flipX ? -s : s, s);

  const bob = state.mood === 'swinging' ? Math.sin(t * 10) * 4 : Math.sin(t * 3.5) * 2;
  ctx.translate(0, bob);

  // Ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 160, 48, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Legs (Dark slate chinos)
  ctx.fillStyle = pal.mikePants;
  drawRoundedRect(ctx, -28, 56, 22, 95, 9);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  drawRoundedRect(ctx, 6, 56, 22, 95, 9);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Shoes
  ctx.fillStyle = '#1E293B';
  drawRoundedRect(ctx, -32, 144, 28, 15, 7);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  drawRoundedRect(ctx, 4, 144, 28, 15, 7);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Torso (Blue button-up shirt)
  ctx.fillStyle = pal.mikeShirt;
  drawRoundedRect(ctx, -40, -40, 80, 102, 20);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Button placket & collar
  ctx.fillStyle = pal.mikeShirtShade;
  ctx.fillRect(-3, -38, 6, 98);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-16, -40);
  ctx.lineTo(0, -24);
  ctx.lineTo(16, -40);
  ctx.closePath();
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Left arm (Blue rolled-up sleeve + forearm)
  const leftArmRot = state.rollingSleeves
    ? 0.65 + Math.sin(t * 7) * 0.15
    : state.mood === 'proud'
    ? -0.35
    : 0.35;
  ctx.save();
  ctx.translate(-36, -24);
  ctx.rotate(leftArmRot);
  // Short rolled sleeve
  ctx.fillStyle = pal.mikeShirt;
  drawRoundedRect(ctx, -10, 0, 20, 28, 8);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  // Rolled cuff
  ctx.fillStyle = '#93C5FD';
  drawRoundedRect(ctx, -11, 22, 22, 8, 4);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  // Bare forearm
  ctx.fillStyle = pal.skin;
  drawRoundedRect(ctx, -8, 28, 16, 32, 7);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  ctx.restore();

  // Right arm (with optional Towel!)
  const rightArmRot = state.hasTowel
    ? (state.towelAngle ?? -0.8)
    : state.rollingSleeves
    ? -0.75 - Math.sin(t * 7) * 0.15
    : -0.25;

  ctx.save();
  ctx.translate(36, -24);
  ctx.rotate(rightArmRot);
  ctx.fillStyle = pal.mikeShirt;
  drawRoundedRect(ctx, -10, 0, 20, 28, 8);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  ctx.fillStyle = '#93C5FD';
  drawRoundedRect(ctx, -11, 22, 22, 8, 4);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  ctx.fillStyle = pal.skin;
  drawRoundedRect(ctx, -8, 28, 16, 32, 7);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // White & blue striped towel in hand
  if (state.hasTowel) {
    ctx.save();
    ctx.translate(0, 58);
    ctx.rotate(state.mood === 'swinging' ? 0.5 : 0.1);
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, -14, -8, 62, 46, 10);
    ctx.fill();
    strokeIfOutlined(ctx, pal);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(-6, -4, 10, 38);
    ctx.fillRect(18, -4, 10, 38);
    ctx.restore();
  }
  ctx.restore();

  // Neck + Head
  ctx.fillStyle = pal.skinShade;
  drawRoundedRect(ctx, -10, -54, 20, 18, 6);
  ctx.fill();

  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, -82, 34, 37, 0, 0, Math.PI * 2);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  if (style === 'clay') {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(-10, -96, 11, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Short tousled hair
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.arc(0, -92, 35, Math.PI * 0.95, Math.PI * 2.05);
  ctx.quadraticCurveTo(18, -114, 0, -105);
  ctx.quadraticCurveTo(-18, -112, -34, -92);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Eyes & confident brows
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-12, -80, 6, 0, Math.PI * 2);
  ctx.arc(12, -80, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-12, -80, 3.8, 0, Math.PI * 2);
  ctx.arc(12, -80, 3.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = pal.hair;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-19, -91);
  ctx.lineTo(-6, -93);
  ctx.moveTo(6, -93);
  ctx.lineTo(19, -91);
  ctx.stroke();

  // Mouth
  const mouthOpen = state.speaking ? 4 + Math.abs(Math.sin(state.talkPhase * 16)) * 6.5 : 0;
  if (state.speaking) {
    ctx.fillStyle = '#991B1B';
    ctx.beginPath();
    ctx.ellipse(0, -61, 8, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#7C2D12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -66, 11, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPigeon(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  x: number,
  y: number,
  t: number,
  facingRight: boolean,
  caught: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facingRight ? 1 : -1, 1);

  const flap = caught ? 0.15 : Math.sin(t * 24) * 0.85;

  // Tail feathers
  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.moveTo(-16, 4);
  ctx.lineTo(-38, -6);
  ctx.lineTo(-34, 12);
  ctx.closePath();
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Body
  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.ellipse(0, 4, 24, 15, -0.2, 0, Math.PI * 2);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Iridescent neck sheen
  ctx.fillStyle = '#2DD4BF';
  ctx.beginPath();
  ctx.ellipse(15, -6, 9, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(19, -12, 11, 0, Math.PI * 2);
  ctx.fill();
  strokeIfOutlined(ctx, pal);

  // Eye
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(22, -14, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(22.5, -14, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.moveTo(28, -13);
  ctx.lineTo(38, -10);
  ctx.lineTo(28, -7);
  ctx.closePath();
  ctx.fill();

  // Flapping Wing
  ctx.save();
  ctx.translate(-2, -2);
  ctx.rotate(flap);
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.ellipse(-4, -14, 16, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  strokeIfOutlined(ctx, pal);
  ctx.restore();

  ctx.restore();
}

function drawFlyingPapers(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  t: number,
  chaosLevel: number
) {
  const papers = [
    { bx: 380, by: 240, spd: 1.8, amp: 45, rot: 0.3 },
    { bx: 520, by: 190, spd: 2.3, amp: 55, rot: -0.4 },
    { bx: 680, by: 270, spd: 1.6, amp: 40, rot: 0.6 },
    { bx: 840, by: 215, spd: 2.1, amp: 50, rot: -0.2 },
    { bx: 450, by: 360, spd: 1.9, amp: 35, rot: 0.4 },
    { bx: 740, by: 410, spd: 1.4, amp: 30, rot: -0.5 },
  ];

  for (let i = 0; i < papers.length; i++) {
    const p = papers[i];
    const settle = 1 - chaosLevel;
    const x = p.bx + Math.sin(t * p.spd + i) * p.amp * chaosLevel + i * 12 * settle;
    const y = lerp(p.by + Math.cos(t * (p.spd + 0.5) + i) * 32, 560 + (i % 3) * 18, settle);
    const angle = p.rot + Math.sin(t * 3 + i) * 0.45 * chaosLevel;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-18, -24, 36, 48);
    if (pal.outline) {
      ctx.strokeStyle = pal.outline;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-18, -24, 36, 48);
    } else {
      ctx.strokeStyle = 'rgba(15,23,42,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-18, -24, 36, 48);
    }
    // Tiny text lines on paper
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(-11, -14, 22, 3);
    ctx.fillRect(-11, -6, 18, 3);
    ctx.fillRect(-11, 2, 20, 3);
    ctx.restore();
  }
}

function drawStylePostProcess(
  ctx: CanvasRenderingContext2D,
  style: VisualStyle,
  width: number,
  height: number
) {
  if (style === 'clay') {
    // Subtle miniature studio vignette
    const vig = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      width * 0.25,
      width * 0.5,
      height * 0.5,
      width * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(30,20,10,0.22)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  } else if (style === 'watercolor') {
    // Soft sunlit paper vignette
    const vig = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      width * 0.3,
      width * 0.5,
      height * 0.5,
      width * 0.75
    );
    vig.addColorStop(0, 'rgba(255,253,248,0)');
    vig.addColorStop(1, 'rgba(244,234,218,0.35)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  } else if (style === 'live-action') {
    // Warm sitcom cinematic grading + subtle edge vignette
    const vig = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      width * 0.32,
      width * 0.5,
      height * 0.5,
      width * 0.76
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(15,23,42,0.18)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawBurnedInSubtitles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  subtitle: ActiveSubtitle | null
) {
  if (!subtitle || !subtitle.text.trim()) return;

  ctx.save();
  // Contrast scrim at bottom for guaranteed legibility
  const scrim = ctx.createLinearGradient(0, height - 155, 0, height);
  scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
  scrim.addColorStop(0.45, 'rgba(0, 0, 0, 0.52)');
  scrim.addColorStop(1, 'rgba(0, 0, 0, 0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, height - 155, width, 155);

  ctx.font = '700 32px "Plus Jakarta Sans", "Noto Sans KR", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = width - 140;
  const lines = wrapSubtitleLines(ctx, subtitle.text, maxWidth).slice(0, 2);

  const lineHeight = 42;
  const baseY = lines.length === 2 ? height - 84 : height - 60;

  for (let i = 0; i < lines.length; i++) {
    const y = baseY + i * lineHeight;
    // Crisp dark outline + drop shadow + pure white bold text
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.lineJoin = 'round';
    ctx.strokeText(lines[i], width / 2, y);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(lines[i], width / 2, y);
  }

  ctx.restore();
}

export function renderVideoFrame({
  ctx,
  width,
  height,
  timeSec,
  beats,
  scene,
  activeSubtitle,
}: RenderFrameParams): void {
  const style = scene.style;
  const pal = getStylePalette(style);

  // Stop-motion stepped time in Clay style (12 fps cadence)
  const animT = style === 'clay' ? Math.floor(timeSec * 12) / 12 : timeSec;

  const { beat, localT } = getBeatAtTime(timeSec, beats);
  const beatId = beat.id;

  const activeSpeakerLower = activeSubtitle?.speaker.trim().toLowerCase() ?? '';
  const jennieSpeaking =
    activeSpeakerLower.includes('jennie') || activeSpeakerLower.includes('jenny');
  const mikeSpeaking = activeSpeakerLower.includes('mike');

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Subtle camera framing per beat (sitcom multi-cam feel)
  let camScale = 1;
  let camX = 0;
  let camY = 0;

  if (beatId === 'hook') {
    camScale = lerp(1.04, 1.0, easeOutCubic(localT));
    camX = lerp(35, 0, easeOutCubic(localT));
  } else if (beatId === 'problem') {
    camScale = lerp(1.0, 1.05, easeInOutQuad(localT));
    camX = lerp(0, -15, localT);
  } else if (beatId === 'turn') {
    camScale = 1.02 + Math.sin(animT * 2.5) * 0.015;
    camX = Math.sin(animT * 1.4) * 18;
  } else if (beatId === 'close') {
    camScale = lerp(1.03, 1.08, easeOutCubic(localT));
    camX = -25;
    camY = -10;
  }

  ctx.translate(width / 2 + camX, height / 2 + camY);
  ctx.scale(camScale, camScale);
  ctx.translate(-width / 2, -height / 2);

  // 1. Living Room Set
  drawLivingRoom(ctx, pal, style, animT, beatId);

  // 2. Papers flying (intense in Hook/Problem/Turn, settling in Close)
  const chaosLevel =
    beatId === 'hook'
      ? lerp(0.3, 1, easeOutCubic(localT * 1.6))
      : beatId === 'problem' || beatId === 'turn'
      ? 1
      : lerp(0.85, 0.05, easeOutCubic(localT));
  drawFlyingPapers(ctx, pal, animT, chaosLevel);

  // 3. Beat-specific Character & Pigeon Choreography
  if (beatId === 'hook') {
    // Pigeon flies in through open window (left -> center-top)
    const pX = lerp(110, 740, easeOutCubic(localT));
    const pY = 230 - Math.sin(localT * Math.PI * 1.5) * 75 + Math.sin(animT * 11) * 16;

    // Jennie reacts on right
    drawJennie(
      ctx,
      pal,
      style,
      {
        x: 840,
        y: 440,
        mood: 'shocked',
        speaking: jennieSpeaking,
        talkPhase: timeSec,
        flipX: true,
      },
      animT
    );

    drawPigeon(ctx, pal, pX, pY, animT, true, false);

    // Comic exclamation burst in 2D
    if (style === '2d' && localT > 0.15 && localT < 0.75) {
      ctx.save();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      for (const [dx, dy] of [
        [-48, -125],
        [0, -142],
        [46, -125],
      ]) {
        ctx.beginPath();
        ctx.moveTo(840 + dx * 0.7, 340 + dy * 0.7);
        ctx.lineTo(840 + dx, 340 + dy);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (beatId === 'problem') {
    // Panicked Jennie steps back left; confident Mike walks in from right rolling sleeves
    const jennieX = lerp(820, 440, easeOutCubic(Math.min(1, localT * 1.8)));
    const mikeX = lerp(1180, 860, easeOutCubic(Math.min(1, localT * 1.4)));
    const pX = 630 + Math.cos(animT * 3.2) * 210;
    const pY = 175 + Math.sin(animT * 4.5) * 45;

    drawJennie(
      ctx,
      pal,
      style,
      {
        x: jennieX,
        y: 440,
        mood: 'panicked',
        speaking: jennieSpeaking,
        talkPhase: timeSec,
      },
      animT
    );

    drawMike(
      ctx,
      pal,
      style,
      {
        x: mikeX,
        y: 432,
        flipX: true,
        mood: 'confident',
        speaking: mikeSpeaking,
        talkPhase: timeSec,
        rollingSleeves: true,
      },
      animT
    );

    drawPigeon(ctx, pal, pX, pY, animT, Math.sin(animT * 3.2) < 0, false);
  } else if (beatId === 'turn') {
    // Jennie hides/peeks near the open window on left; Mike grabs towel & chases pigeon!
    const mikeX = 760 + Math.sin(animT * 2.6) * 145;
    const mikeFlip = Math.cos(animT * 2.6) < 0;
    const pX = 640 + Math.cos(animT * 3.6) * 220;
    const pY = 230 + Math.sin(animT * 5.2) * 75;

    drawJennie(
      ctx,
      pal,
      style,
      {
        x: 345,
        y: 448,
        mood: 'peeking',
        speaking: jennieSpeaking,
        talkPhase: timeSec,
      },
      animT
    );

    drawMike(
      ctx,
      pal,
      style,
      {
        x: mikeX,
        y: 432,
        flipX: mikeFlip,
        mood: 'swinging',
        speaking: mikeSpeaking,
        talkPhase: timeSec,
        hasTowel: true,
        towelAngle: -1.1 + Math.sin(animT * 9) * 0.45,
      },
      animT
    );

    drawPigeon(ctx, pal, pX, pY, animT, Math.sin(animT * 3.6) < 0, false);
  } else {
    // Beat 4 (Close): Mike swings & misses comically (0..0.48), then catches pigeon (0.52..1.0) and smiles proudly!
    const missedPhase = localT < 0.48;
    const swingAngle = missedPhase
      ? lerp(-1.8, 1.3, easeOutCubic(localT / 0.48))
      : lerp(0.8, -0.45, easeOutCubic((localT - 0.48) / 0.35));

    const pX = missedPhase
      ? lerp(720, 540, easeInOutQuad(localT / 0.48))
      : lerp(540, 742, easeOutCubic(Math.min(1, (localT - 0.48) / 0.25)));
    const pY = missedPhase
      ? 260 + Math.sin(localT * 14) * 28
      : lerp(260, 415, easeOutCubic(Math.min(1, (localT - 0.48) / 0.25)));

    drawJennie(
      ctx,
      pal,
      style,
      {
        x: 390,
        y: 442,
        mood: missedPhase ? 'panicked' : 'relieved',
        speaking: jennieSpeaking,
        talkPhase: timeSec,
      },
      animT
    );

    drawMike(
      ctx,
      pal,
      style,
      {
        x: 780,
        y: 432,
        flipX: true,
        mood: missedPhase ? 'swinging' : 'proud',
        speaking: mikeSpeaking,
        talkPhase: timeSec,
        hasTowel: true,
        towelAngle: swingAngle,
      },
      animT
    );

    drawPigeon(
      ctx,
      pal,
      pX,
      pY,
      animT,
      false,
      !missedPhase && localT > 0.65
    );
  }

  ctx.restore();

  // 4. Style post-processing
  drawStylePostProcess(ctx, style, width, height);

  // 5. Burned-in English Subtitles (always sharp, unscaled, bottom max 2 lines)
  drawBurnedInSubtitles(ctx, width, height, activeSubtitle);
}
