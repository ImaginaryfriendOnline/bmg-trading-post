import type { CertificateFields, TradeAction } from './types.ts';
import { type SingleLineField, type MultiLineField, fillTextTruncated, wrapText, loadImage } from './textLayout.ts';

export const CANVAS_WIDTH = 1965;
export const CANVAS_HEIGHT = 871;

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
  // Signoff text fills the box up to the reserved logo square on the right, so toggling the logo never reflows text.
  signoff: { x: 1348, y: 708, maxWidth: 410, lineHeight: 34, maxLines: 4, fontSize: 24 } as MultiLineField,
};

/** Reserved square in the right part of the signoff box for the optional BMG logo. */
export const LOGO_LAYOUT = { x: 1793, y: 711, width: 100, height: 100 };

/** Bounding ellipses around each pre-printed word in the Action column, measured against row 1; add ACTION_ROW_Y_STEP per row below. */
const ACTION_WORD_LAYOUT: Record<TradeAction, { cx: number; cy: number; rx: number; ry: number }> = {
  Trade: { cx: 259.5, cy: 479, rx: 48, ry: 20 },
  Buy: { cx: 359, cy: 483, rx: 34, ry: 22 },
  Scribe: { cx: 460, cy: 479, rx: 51, ry: 20 },
};
const ACTION_ROW_Y_STEP = 58;

function circleSelectedAction(ctx: CanvasRenderingContext2D, action: TradeAction, rowIndex: number): void {
  const word = ACTION_WORD_LAYOUT[action];
  ctx.save();
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(word.cx, word.cy + rowIndex * ACTION_ROW_Y_STEP, word.rx, word.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

let backgroundImage: HTMLImageElement | undefined;

export async function loadBackgroundImage(): Promise<HTMLImageElement> {
  if (backgroundImage) return backgroundImage;
  backgroundImage = await loadImage(`${import.meta.env.BASE_URL}trading-post-cert.png`);
  return backgroundImage;
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
    circleSelectedAction(ctx, row.action, index);
    fillTextTruncated(ctx, row.itemGold, layout.itemGold);
    fillTextTruncated(ctx, row.newItemSpell, layout.newItemSpell);
  });

  wrapText(ctx, fields.notes, FIELD_LAYOUT.notes);
  wrapText(ctx, fields.signoff, FIELD_LAYOUT.signoff);

  if (fields.showLogo && logo) {
    ctx.drawImage(logo, LOGO_LAYOUT.x, LOGO_LAYOUT.y, LOGO_LAYOUT.width, LOGO_LAYOUT.height);
  }
}
