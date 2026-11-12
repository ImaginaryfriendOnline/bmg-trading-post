import type { CertificateFields } from './types.ts';

export const CANVAS_WIDTH = 1965;
export const CANVAS_HEIGHT = 871;

interface SingleLineField {
  x: number;
  y: number;
  maxWidth: number;
  fontSize: number;
}

interface MultiLineField {
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
  maxLines: number;
  fontSize: number;
}

/** Starting estimates tuned against Trading Post Cert.png — adjust here if the overlay drifts off the printed lines. */
export const FIELD_LAYOUT = {
  convention: { x: 415, y: 228, maxWidth: 1490, fontSize: 30 } as SingleLineField,
  player: { x: 415, y: 278, maxWidth: 1490, fontSize: 30 } as SingleLineField,
  character: { x: 415, y: 328, maxWidth: 1490, fontSize: 30 } as SingleLineField,
  trades: [
    {
      itemGold: { x: 700, y: 488, maxWidth: 618, fontSize: 26 } as SingleLineField,
      newItemSpell: { x: 1348, y: 488, maxWidth: 565, fontSize: 26 } as SingleLineField,
    },
    {
      itemGold: { x: 700, y: 546, maxWidth: 618, fontSize: 26 } as SingleLineField,
      newItemSpell: { x: 1348, y: 546, maxWidth: 565, fontSize: 26 } as SingleLineField,
    },
    {
      itemGold: { x: 700, y: 604, maxWidth: 618, fontSize: 26 } as SingleLineField,
      newItemSpell: { x: 1348, y: 604, maxWidth: 565, fontSize: 26 } as SingleLineField,
    },
  ] as const,
  notes: { x: 50, y: 708, maxWidth: 1250, lineHeight: 34, maxLines: 4, fontSize: 24 } as MultiLineField,
  // Signoff text starts right of the reserved logo square below, so toggling the logo never reflows the text.
  signoff: { x: 1455, y: 708, maxWidth: 458, lineHeight: 34, maxLines: 4, fontSize: 24 } as MultiLineField,
};

/** Reserved square in the left part of the signoff box for the optional BMG logo. */
export const LOGO_LAYOUT = { x: 1343, y: 711, width: 100, height: 100 };

let backgroundImage: HTMLImageElement | undefined;

export async function loadBackgroundImage(): Promise<HTMLImageElement> {
  if (backgroundImage) return backgroundImage;
  const img = new Image();
  img.src = `${import.meta.env.BASE_URL}trading-post-cert.png`;
  await img.decode();
  backgroundImage = img;
  return img;
}

let logoImage: HTMLImageElement | undefined;

export async function loadLogoImage(): Promise<HTMLImageElement> {
  if (logoImage) return logoImage;
  const img = new Image();
  img.src = `${import.meta.env.BASE_URL}bmg-logo.png`;
  await img.decode();
  logoImage = img;
  return img;
}

function fillTextTruncated(ctx: CanvasRenderingContext2D, text: string, field: SingleLineField): void {
  if (!text) return;
  ctx.font = `600 ${field.fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'alphabetic';

  let display = text;
  if (ctx.measureText(display).width > field.maxWidth) {
    while (display.length > 1 && ctx.measureText(`${display}…`).width > field.maxWidth) {
      display = display.slice(0, -1);
    }
    display = `${display}…`;
  }
  ctx.fillText(display, field.x, field.y);
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, field: MultiLineField): void {
  if (!text) return;
  ctx.font = `400 ${field.fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'alphabetic';

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > field.maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === field.maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < field.maxLines && current) lines.push(current);

  const truncated = lines.length === field.maxLines && words.join(' ') !== lines.join(' ');
  if (truncated) {
    const lastIndex = lines.length - 1;
    let lastLine = lines[lastIndex] ?? '';
    while (lastLine.length > 1 && ctx.measureText(`${lastLine}…`).width > field.maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[lastIndex] = `${lastLine}…`;
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, field.x, field.y + index * field.lineHeight);
  });
}

export function drawCertificate(
  ctx: CanvasRenderingContext2D,
  bg: HTMLImageElement,
  logo: HTMLImageElement | undefined,
  fields: CertificateFields,
): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.drawImage(bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  fillTextTruncated(ctx, fields.convention, FIELD_LAYOUT.convention);
  fillTextTruncated(ctx, fields.player, FIELD_LAYOUT.player);
  fillTextTruncated(ctx, fields.character, FIELD_LAYOUT.character);

  fields.trades.forEach((row, index) => {
    const layout = FIELD_LAYOUT.trades[index];
    if (!layout) return;
    fillTextTruncated(ctx, row.itemGold, layout.itemGold);
    fillTextTruncated(ctx, row.newItemSpell, layout.newItemSpell);
  });

  wrapText(ctx, fields.notes, FIELD_LAYOUT.notes);
  wrapText(ctx, fields.signoff, FIELD_LAYOUT.signoff);

  if (fields.showLogo && logo) {
    ctx.drawImage(logo, LOGO_LAYOUT.x, LOGO_LAYOUT.y, LOGO_LAYOUT.width, LOGO_LAYOUT.height);
  }
}
