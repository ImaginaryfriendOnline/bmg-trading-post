import './style.css';
import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase.ts';
import { copyTextToClipboard } from './clipboard.ts';
import type { PlayerRequestDoc, PlayerRequestFields, TradeAction } from './types.ts';

function main(): void {
  const player = document.querySelector<HTMLInputElement>('#player')!;
  const character = document.querySelector<HTMLInputElement>('#character')!;
  const notes = document.querySelector<HTMLTextAreaElement>('#notes')!;
  const formStatus = document.querySelector<HTMLDivElement>('#form-status')!;
  const resultPanel = document.querySelector<HTMLElement>('#result-panel')!;
  const summaryText = document.querySelector<HTMLTextAreaElement>('#summary-text')!;
  const requestLink = document.querySelector<HTMLInputElement>('#request-link')!;

  const tradeRowInputs = [0, 1, 2].map((index) => ({
    action: document.querySelector<HTMLSelectElement>(`#trade-${index}-action`)!,
    itemGold: document.querySelector<HTMLInputElement>(`#trade-${index}-item-gold`)!,
    newItemSpell: document.querySelector<HTMLInputElement>(`#trade-${index}-new-item`)!,
  }));

  function setStatus(message: string, kind: 'success' | 'error' | '' = ''): void {
    formStatus.textContent = message;
    if (kind) formStatus.dataset['kind'] = kind;
    else delete formStatus.dataset['kind'];
  }

  function readFields(): PlayerRequestFields {
    const [row0, row1, row2] = tradeRowInputs;
    return {
      player: player.value,
      character: character.value,
      trades: [row0, row1, row2].map((row) => ({
        action: row!.action.value as TradeAction,
        itemGold: row!.itemGold.value,
        newItemSpell: row!.newItemSpell.value,
      })) as PlayerRequestFields['trades'],
      notes: notes.value,
    };
  }

  function buildSummary(fields: PlayerRequestFields, link: string): string {
    const lines = [`Player: ${fields.player}`, `Character: ${fields.character}`, ''];
    const activeTrades = fields.trades.filter((trade) => trade.action !== 'None');
    if (activeTrades.length === 0) {
      lines.push('(no transactions specified)');
    } else {
      activeTrades.forEach((trade, index) => {
        lines.push(`${index + 1}. ${trade.action}: ${trade.itemGold} -> ${trade.newItemSpell}`);
      });
    }
    if (fields.notes.trim()) lines.push('', `Notes: ${fields.notes.trim()}`);
    lines.push('', link);
    return lines.join('\n');
  }

  document.querySelector<HTMLButtonElement>('#generate-btn')!.addEventListener('click', () => {
    void (async () => {
      const fields = readFields();
      if (!fields.player.trim() || !fields.character.trim()) {
        setStatus('Player and Character are required.', 'error');
        return;
      }

      setStatus('Submitting…');
      try {
        const docData: PlayerRequestDoc = { ...fields, createdAt: Date.now(), status: 'pending' };
        const ref = await addDoc(collection(db, 'requests'), docData);
        const link = `${location.origin}${import.meta.env.BASE_URL}index.html#req=${ref.id}`;

        summaryText.value = buildSummary(fields, link);
        requestLink.value = link;
        resultPanel.hidden = false;
        setStatus('Request submitted — copy the summary or link below.', 'success');
      } catch {
        setStatus('Could not submit the request (offline?). Try again.', 'error');
      }
    })();
  });

  document.querySelector<HTMLButtonElement>('#copy-summary-btn')!.addEventListener('click', () => {
    void copyTextToClipboard(summaryText.value).catch(() => {
      setStatus('Copy failed — select and copy manually.', 'error');
    });
  });

  document.querySelector<HTMLButtonElement>('#copy-link-btn')!.addEventListener('click', () => {
    void copyTextToClipboard(requestLink.value).catch(() => {
      setStatus('Copy failed — select and copy manually.', 'error');
    });
  });
}

main();
