import type { DeathInsuranceFields } from './types.ts';
import { type SingleLineField, fillTextTruncated, loadImage } from './textLayout.ts';

export const DEATH_CANVAS_WIDTH = 1117;
export const DEATH_CANVAS_HEIGHT = 1425;

/** Starting estimates tuned against Death Insurance Cert.png — adjust here if the overlay drifts off the printed lines. */
export const FIELD_LAYOUT = {
  player: { x: 465, y: 692, maxWidth: 595, fontSize: 26 } as SingleLineField,
  characterAndLevel: { x: 465, y: 743, maxWidth: 595, fontSize: 26 } as SingleLineField,
  // Signature sits in the top-left of its tall row, leaving the bottom-right free for the logo.
  signature: { x: 465, y: 800, maxWidth: 420, fontSize: 26 } as SingleLineField,
};

/** Reserved square in the bottom-right of the signature row for the BMG logo. */
export const LOGO_LAYOUT = { x: 940, y: 826, width: 110, height: 110 };

let backgroundImage: HTMLImageElement | undefined;

export async function loadDeathBackgroundImage(): Promise<HTMLImageElement> {
  if (backgroundImage) return backgroundImage;
  backgroundImage = await loadImage(`${import.meta.env.BASE_URL}death-insurance-cert.png`);
  return backgroundImage;
}

export function drawDeathInsuranceCertificate(
  ctx: CanvasRenderingContext2D,
  bg: HTMLImageElement,
  logo: HTMLImageElement | undefined,
  fields: DeathInsuranceFields,
): void {
  ctx.clearRect(0, 0, DEATH_CANVAS_WIDTH, DEATH_CANVAS_HEIGHT);
  ctx.drawImage(bg, 0, 0, DEATH_CANVAS_WIDTH, DEATH_CANVAS_HEIGHT);

  fillTextTruncated(ctx, fields.player, FIELD_LAYOUT.player);
  fillTextTruncated(ctx, fields.characterAndLevel, FIELD_LAYOUT.characterAndLevel);
  fillTextTruncated(ctx, fields.signature, FIELD_LAYOUT.signature);

  if (logo) {
    ctx.drawImage(logo, LOGO_LAYOUT.x, LOGO_LAYOUT.y, LOGO_LAYOUT.width, LOGO_LAYOUT.height);
  }
}
