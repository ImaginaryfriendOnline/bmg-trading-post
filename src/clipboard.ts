import { canvasToBlob } from './exportImage.ts';

export function isClipboardImageSupported(): boolean {
  return window.isSecureContext && !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined';
}

/** Copies the canvas to the clipboard as PNG — the only format ClipboardItem reliably supports cross-browser. */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await canvasToBlob(canvas, 'image/png', 1);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
