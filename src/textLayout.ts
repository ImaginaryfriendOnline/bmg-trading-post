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
