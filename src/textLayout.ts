export interface SingleLineField {
  x: number;
  y: number;
  maxWidth: number;
  fontSize: number;
}

export interface MultiLineField {
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
  maxLines: number;
  fontSize: number;
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Draws an image scaled to fit (preserving aspect ratio) within and centered in the given box. */
export function drawImageContained(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: { x: number; y: number; width: number; height: number },
): void {
  const scale = Math.min(box.width / img.width, box.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = box.x + (box.width - w) / 2;
  const y = box.y + (box.height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

export function fillTextTruncated(ctx: CanvasRenderingContext2D, text: string, field: SingleLineField): void {
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

/** Word-wraps each paragraph to maxWidth, but treats '\n' in the source text as a hard line break. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, field: MultiLineField): void {
  if (!text) return;
  ctx.font = `400 ${field.fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'alphabetic';

  const allLines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      allLines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > field.maxWidth && current) {
        allLines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    allLines.push(current);
  }

  const lines = allLines.slice(0, field.maxLines);
  if (allLines.length > field.maxLines) {
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
