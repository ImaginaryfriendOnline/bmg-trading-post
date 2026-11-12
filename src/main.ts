import './style.css';
import { drawCertificate, loadBackgroundImage, CANVAS_WIDTH, CANVAS_HEIGHT } from './certificateCanvas.ts';
import {
  drawDeathInsuranceCertificate,
  loadDeathBackgroundImage,
  DEATH_CANVAS_WIDTH,
  DEATH_CANVAS_HEIGHT,
} from './deathInsuranceCanvas.ts';
import { loadImage } from './textLayout.ts';
import { canvasToBlob, downloadBlob, EXTENSIONS } from './exportImage.ts';
import { saveFileAs } from './saveFile.ts';
import { copyCanvasToClipboard, isClipboardImageSupported } from './clipboard.ts';
import { ensureUnlocked } from './passwordGate.ts';
import { getCookie, setCookie } from './cookies.ts';
import type { CertificateFields, DeathInsuranceFields, ExportFormat, TradeAction, CertId, LogoChoice } from './types.ts';

const CONVENTION_COOKIE = 'trade-cert-convention';
const SIGNOFF_COOKIE = 'trade-cert-signoff';
const DEATH_SIGNATURE_COOKIE = 'death-cert-signature';

async function main(): Promise<void> {
  await ensureUnlocked();

  const canvas = document.querySelector<HTMLCanvasElement>('#cert-canvas')!;
  const ctx = canvas.getContext('2d')!;
  const exportFormat = document.querySelector<HTMLSelectElement>('#export-format')!;
  const downloadBtn = document.querySelector<HTMLButtonElement>('#download-btn')!;
  const copyBtn = document.querySelector<HTMLButtonElement>('#copy-btn')!;
  const exportStatus = document.querySelector<HTMLDivElement>('#export-status')!;

  function setStatus(message: string, kind: 'success' | 'error' | '' = ''): void {
    exportStatus.textContent = message;
    if (kind) exportStatus.dataset['kind'] = kind;
    else delete exportStatus.dataset['kind'];
  }

  const bmgLogo = await loadImage(`${import.meta.env.BASE_URL}bmg-logo.png`);
  const iuzualLogo = await loadImage(`${import.meta.env.BASE_URL}iuzual-suspects-logo.png`);
  const logoChoice = document.querySelector<HTMLSelectElement>('#logo-choice')!;

  function getSelectedLogo(): HTMLImageElement | undefined {
    const choice = logoChoice.value as LogoChoice;
    if (choice === 'bmg') return bmgLogo;
    if (choice === 'iuzual') return iuzualLogo;
    return undefined;
  }

  logoChoice.addEventListener('change', () => certs[activeCert].render());

  // ------------------------------------------------------------- trade cert

  const convention = document.querySelector<HTMLInputElement>('#convention')!;
  const player = document.querySelector<HTMLInputElement>('#player')!;
  const character = document.querySelector<HTMLInputElement>('#character')!;
  const notes = document.querySelector<HTMLTextAreaElement>('#notes')!;
  const signoff = document.querySelector<HTMLTextAreaElement>('#signoff')!;

  const tradeRowInputs = [0, 1, 2].map((index) => ({
    action: document.querySelector<HTMLSelectElement>(`#trade-${index}-action`)!,
    itemGold: document.querySelector<HTMLInputElement>(`#trade-${index}-item-gold`)!,
    newItemSpell: document.querySelector<HTMLInputElement>(`#trade-${index}-new-item`)!,
  }));

  function readTradeFields(): CertificateFields {
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
    };
  }

  const tradeBackground = await loadBackgroundImage();

  function renderTrade(): void {
    drawCertificate(ctx, tradeBackground, getSelectedLogo(), readTradeFields());
  }

  const tradeInputs = [
    convention,
    player,
    character,
    notes,
    signoff,
    ...tradeRowInputs.flatMap((row) => [row.action, row.itemGold, row.newItemSpell]),
  ];
  for (const input of tradeInputs) {
    input.addEventListener('input', () => {
      if (activeCert === 'trade') renderTrade();
    });
    input.addEventListener('change', () => {
      if (activeCert === 'trade') renderTrade();
    });
  }

  const storedConvention = getCookie(CONVENTION_COOKIE);
  if (storedConvention !== undefined) convention.value = storedConvention;
  const storedSignoff = getCookie(SIGNOFF_COOKIE);
  if (storedSignoff !== undefined) signoff.value = storedSignoff;

  convention.addEventListener('input', () => setCookie(CONVENTION_COOKIE, convention.value));
  signoff.addEventListener('input', () => setCookie(SIGNOFF_COOKIE, signoff.value));

  document.querySelector<HTMLButtonElement>('#clear-trade')!.addEventListener('click', () => {
    player.value = '';
    character.value = '';
    for (const row of tradeRowInputs) {
      row.action.value = 'None';
      row.itemGold.value = '';
      row.newItemSpell.value = '';
    }
    notes.value = '';
    renderTrade();
  });

  // ------------------------------------------------------- death insurance

  const deathPlayer = document.querySelector<HTMLInputElement>('#death-player')!;
  const deathCharacter = document.querySelector<HTMLInputElement>('#death-character')!;
  const deathLevel = document.querySelector<HTMLInputElement>('#death-level')!;
  const deathSignature = document.querySelector<HTMLTextAreaElement>('#death-signature')!;

  function readDeathFields(): DeathInsuranceFields {
    const character = deathCharacter.value.trim();
    const level = deathLevel.value.trim();
    const characterAndLevel = level ? `${character ? `${character} ` : ''}(Level ${level})` : character;
    return {
      player: deathPlayer.value,
      characterAndLevel,
      signature: deathSignature.value,
    };
  }

  const deathBackground = await loadDeathBackgroundImage();

  function renderDeath(): void {
    drawDeathInsuranceCertificate(ctx, deathBackground, getSelectedLogo(), readDeathFields());
  }

  const deathInputs = [deathPlayer, deathCharacter, deathLevel, deathSignature];
  for (const input of deathInputs) {
    input.addEventListener('input', () => {
      if (activeCert === 'death-insurance') renderDeath();
    });
    input.addEventListener('change', () => {
      if (activeCert === 'death-insurance') renderDeath();
    });
  }

  const storedSignature = getCookie(DEATH_SIGNATURE_COOKIE);
  if (storedSignature !== undefined) deathSignature.value = storedSignature;

  deathSignature.addEventListener('input', () => setCookie(DEATH_SIGNATURE_COOKIE, deathSignature.value));

  document.querySelector<HTMLButtonElement>('#clear-death')!.addEventListener('click', () => {
    deathPlayer.value = '';
    deathCharacter.value = '';
    deathLevel.value = '';
    renderDeath();
  });

  // ------------------------------------------------------------------ tabs

  const certs: Record<CertId, { width: number; height: number; render: () => void; filenameBase: string }> = {
    trade: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, render: renderTrade, filenameBase: 'coinlords-caravan-certificate' },
    'death-insurance': {
      width: DEATH_CANVAS_WIDTH,
      height: DEATH_CANVAS_HEIGHT,
      render: renderDeath,
      filenameBase: 'death-insurance-certificate',
    },
  };

  let activeCert: CertId = 'trade';

  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab');
  function activateCert(id: CertId): void {
    activeCert = id;
    const cert = certs[id];
    canvas.width = cert.width;
    canvas.height = cert.height;
    cert.render();

    for (const button of tabButtons) {
      button.classList.toggle('active', button.dataset['cert'] === id);
    }
    for (const panel of document.querySelectorAll<HTMLDivElement>('.cert-panels')) {
      panel.hidden = panel.id !== `panels-${id}`;
    }
    setStatus('');
  }

  for (const button of tabButtons) {
    button.addEventListener('click', () => activateCert(button.dataset['cert'] as CertId));
  }

  // --------------------------------------------------------------- export

  downloadBtn.addEventListener('click', () => {
    void (async () => {
      try {
        const format = exportFormat.value as ExportFormat;
        const blob = await canvasToBlob(canvas, format, 0.92);
        const extension = EXTENSIONS[format];
        const filename = `${certs[activeCert].filenameBase}.${extension}`;
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

  activateCert('trade');
}

void main();
