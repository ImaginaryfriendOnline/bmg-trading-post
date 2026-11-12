import './style.css';
import { drawCertificate, loadBackgroundImage, loadLogoImage } from './certificateCanvas.ts';
import { canvasToBlob, downloadBlob, EXTENSIONS } from './exportImage.ts';
import { saveFileAs } from './saveFile.ts';
import { copyCanvasToClipboard, isClipboardImageSupported } from './clipboard.ts';
import { ensureUnlocked } from './passwordGate.ts';
import { getCookie, setCookie } from './cookies.ts';
import type { CertificateFields, ExportFormat, TradeAction } from './types.ts';

const CONVENTION_COOKIE = 'trade-cert-convention';
const SIGNOFF_COOKIE = 'trade-cert-signoff';

async function main(): Promise<void> {
  await ensureUnlocked();

  const canvas = document.querySelector<HTMLCanvasElement>('#cert-canvas')!;
  const ctx = canvas.getContext('2d')!;

  const convention = document.querySelector<HTMLInputElement>('#convention')!;
  const player = document.querySelector<HTMLInputElement>('#player')!;
  const character = document.querySelector<HTMLInputElement>('#character')!;
  const notes = document.querySelector<HTMLTextAreaElement>('#notes')!;
  const signoff = document.querySelector<HTMLTextAreaElement>('#signoff')!;
  const showLogo = document.querySelector<HTMLInputElement>('#show-logo')!;
  const exportFormat = document.querySelector<HTMLSelectElement>('#export-format')!;
  const downloadBtn = document.querySelector<HTMLButtonElement>('#download-btn')!;
  const copyBtn = document.querySelector<HTMLButtonElement>('#copy-btn')!;
  const exportStatus = document.querySelector<HTMLDivElement>('#export-status')!;

  const tradeRowInputs = [0, 1, 2].map((index) => ({
    action: document.querySelector<HTMLSelectElement>(`#trade-${index}-action`)!,
    itemGold: document.querySelector<HTMLInputElement>(`#trade-${index}-item-gold`)!,
    newItemSpell: document.querySelector<HTMLInputElement>(`#trade-${index}-new-item`)!,
  }));

  function readFields(): CertificateFields {
    const [row0, row1, row2] = tradeRowInputs;
    return {
      convention: convention.value,
      player: player.value,
      character: character.value,
      trades: [row0, row1, row2].map((row) => ({
        action: row!.action.value as TradeAction,
        itemGold: row!.itemGold.value,
        newItemSpell: row!.newItemSpell.value,
      })) as CertificateFields['trades'],
      notes: notes.value,
      signoff: signoff.value,
      showLogo: showLogo.checked,
    };
  }

  let backgroundImage: HTMLImageElement | undefined;
  let logoImage: HTMLImageElement | undefined;

  function render(): void {
    if (!backgroundImage) return;
    drawCertificate(ctx, backgroundImage, logoImage, readFields());
  }

  function setStatus(message: string, kind: 'success' | 'error' | '' = ''): void {
    exportStatus.textContent = message;
    if (kind) exportStatus.dataset['kind'] = kind;
    else delete exportStatus.dataset['kind'];
  }

  const allInputs = [
    convention,
    player,
    character,
    notes,
    signoff,
    showLogo,
    ...tradeRowInputs.flatMap((row) => [row.action, row.itemGold, row.newItemSpell]),
  ];
  for (const input of allInputs) {
    input.addEventListener('input', render);
    input.addEventListener('change', render);
  }

  const storedConvention = getCookie(CONVENTION_COOKIE);
  if (storedConvention !== undefined) convention.value = storedConvention;
  const storedSignoff = getCookie(SIGNOFF_COOKIE);
  if (storedSignoff !== undefined) signoff.value = storedSignoff;

  convention.addEventListener('input', () => setCookie(CONVENTION_COOKIE, convention.value));
  signoff.addEventListener('input', () => setCookie(SIGNOFF_COOKIE, signoff.value));

  downloadBtn.addEventListener('click', () => {
    void (async () => {
      try {
        const format = exportFormat.value as ExportFormat;
        const blob = await canvasToBlob(canvas, format, 0.92);
        const extension = EXTENSIONS[format];
        const filename = `coinlords-caravan-certificate.${extension}`;
        if (window.showSaveFilePicker) {
          await saveFileAs(blob, filename, {
            description: 'Certificate image',
            accept: { [format]: [`.${extension}`] },
          });
        } else {
          downloadBlob(blob, filename);
        }
        setStatus('Downloaded.', 'success');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Download failed.', 'error');
      }
    })();
  });

  copyBtn.addEventListener('click', () => {
    void (async () => {
      if (!isClipboardImageSupported()) {
        setStatus("Clipboard copy isn't supported in this browser — try Download instead.", 'error');
        return;
      }
      try {
        await copyCanvasToClipboard(canvas);
        setStatus('Copied to clipboard.', 'success');
        window.setTimeout(() => setStatus(''), 2000);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Copy failed.', 'error');
      }
    })();
  });

  backgroundImage = await loadBackgroundImage();
  logoImage = await loadLogoImage();
  render();
}

void main();
