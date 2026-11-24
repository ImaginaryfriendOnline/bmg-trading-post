import './style.css';
import { collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase.ts';
import { ensureUnlocked, sha256Hex } from './passwordGate.ts';
import { setPasswordHash } from './passwordConfig.ts';
import { getDefaultConvention, setDefaultConvention } from './appSettings.ts';
import type { PlayerRequestDoc } from './types.ts';

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

const PAGE_SIZE = 15;

async function main(): Promise<void> {
  await ensureUnlocked('admin');

  const tbody = document.querySelector<HTMLTableSectionElement>('#requests-tbody')!;
  const passwordStatus = document.querySelector<HTMLDivElement>('#password-status')!;
  const playerFilter = document.querySelector<HTMLInputElement>('#player-filter')!;
  const pageIndicator = document.querySelector<HTMLSpanElement>('#page-indicator')!;
  const prevPageBtn = document.querySelector<HTMLButtonElement>('#prev-page-btn')!;
  const nextPageBtn = document.querySelector<HTMLButtonElement>('#next-page-btn')!;

  let allRequests: Array<{ id: string; data: PlayerRequestDoc }> = [];
  let currentPage = 0;

  function setPasswordStatus(message: string, kind: 'success' | 'error' | '' = ''): void {
    passwordStatus.textContent = message;
    if (kind) passwordStatus.dataset['kind'] = kind;
    else delete passwordStatus.dataset['kind'];
  }

  function buildDetailsHtml(data: PlayerRequestDoc): string {
    const activeTrades = data.trades.filter((trade) => trade.action !== 'None');
    const tradesHtml =
      activeTrades.length === 0
        ? '<li>(no transactions specified)</li>'
        : activeTrades
            .map(
              (trade) =>
                `<li>${escapeHtml(trade.action)}: ${escapeHtml(trade.itemGold)} -&gt; ${escapeHtml(trade.newItemSpell)}</li>`,
            )
            .join('');
    const notesHtml = data.notes.trim() ? `<p><strong>Notes:</strong> ${escapeHtml(data.notes)}</p>` : '';
    const conventionHtml = data.convention ? `<p><strong>Convention:</strong> ${escapeHtml(data.convention)}</p>` : '';
    return `${conventionHtml}<ul>${tradesHtml}</ul>${notesHtml}`;
  }

  function filteredRequests(): Array<{ id: string; data: PlayerRequestDoc }> {
    const needle = playerFilter.value.trim().toLowerCase();
    if (!needle) return allRequests;
    return allRequests.filter((request) => request.data.player.toLowerCase().includes(needle));
  }

  function renderPage(): void {
    const filtered = filteredRequests();
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount - 1);
    const pageRequests = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

    tbody.innerHTML = '';
    for (const { id, data } of pageRequests) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><button type="button" class="secondary expand-row" data-id="${id}" aria-expanded="false">+</button></td>
        <td>${escapeHtml(data.player)}</td>
        <td>${escapeHtml(data.character)}</td>
        <td>${new Date(data.createdAt).toLocaleString()}</td>
        <td>${escapeHtml(data.status)}</td>
        <td><a href="index.html#req=${id}" target="_blank" rel="noopener">Open</a></td>
        <td><button type="button" class="secondary delete-row" data-id="${id}">Delete</button></td>
      `;
      const detailsRow = document.createElement('tr');
      detailsRow.className = 'details-row';
      detailsRow.hidden = true;
      const detailsCell = document.createElement('td');
      detailsCell.colSpan = 7;
      detailsCell.innerHTML = buildDetailsHtml(data);
      detailsRow.append(detailsCell);
      tbody.append(row, detailsRow);
    }

    tbody.querySelectorAll<HTMLButtonElement>('.expand-row').forEach((button) => {
      button.addEventListener('click', () => {
        const detailsRow = button.closest('tr')!.nextElementSibling as HTMLTableRowElement;
        const expanded = button.getAttribute('aria-expanded') === 'true';
        detailsRow.hidden = expanded;
        button.setAttribute('aria-expanded', String(!expanded));
        button.textContent = expanded ? '+' : '−';
      });
    });

    tbody.querySelectorAll<HTMLButtonElement>('.delete-row').forEach((button) => {
      button.addEventListener('click', () => {
        void (async () => {
          await deleteDoc(doc(db, 'requests', button.dataset['id']!));
          await loadRequests();
        })();
      });
    });

    pageIndicator.textContent = `Page ${currentPage + 1} of ${pageCount} (${filtered.length} request${filtered.length === 1 ? '' : 's'})`;
    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = currentPage >= pageCount - 1;
  }

  async function loadRequests(): Promise<void> {
    const snap = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc')));
    allRequests = snap.docs.map((requestDoc) => ({ id: requestDoc.id, data: requestDoc.data() as PlayerRequestDoc }));
    renderPage();
  }

  playerFilter.addEventListener('input', () => {
    currentPage = 0;
    renderPage();
  });

  prevPageBtn.addEventListener('click', () => {
    currentPage = Math.max(0, currentPage - 1);
    renderPage();
  });

  nextPageBtn.addEventListener('click', () => {
    currentPage += 1;
    renderPage();
  });

  document.querySelector<HTMLButtonElement>('#refresh-btn')!.addEventListener('click', () => {
    void loadRequests();
  });

  document.querySelector<HTMLButtonElement>('#clear-all-btn')!.addEventListener('click', () => {
    if (!confirm('Delete ALL requests? This cannot be undone.')) return;
    void (async () => {
      const snap = await getDocs(collection(db, 'requests'));
      await Promise.all(snap.docs.map((requestDoc) => deleteDoc(doc(db, 'requests', requestDoc.id))));
      await loadRequests();
    })();
  });

  function wirePasswordUpdate(buttonId: string, inputId: string, slot: 'cert-gen' | 'admin'): void {
    document.querySelector<HTMLButtonElement>(buttonId)!.addEventListener('click', () => {
      void (async () => {
        const input = document.querySelector<HTMLInputElement>(inputId)!;
        if (!input.value) {
          setPasswordStatus('Enter a new password first.', 'error');
          return;
        }
        try {
          await setPasswordHash(slot, await sha256Hex(input.value));
          input.value = '';
          setPasswordStatus(`${slot === 'cert-gen' ? 'Cert-generator' : 'Admin'} password updated.`, 'success');
        } catch {
          setPasswordStatus('Could not update the password (offline?).', 'error');
        }
      })();
    });
  }

  wirePasswordUpdate('#save-cert-gen-password', '#new-cert-gen-password', 'cert-gen');
  wirePasswordUpdate('#save-admin-password', '#new-admin-password', 'admin');

  const conventionStatus = document.querySelector<HTMLDivElement>('#convention-status')!;
  function setConventionStatus(message: string, kind: 'success' | 'error' | '' = ''): void {
    conventionStatus.textContent = message;
    if (kind) conventionStatus.dataset['kind'] = kind;
    else delete conventionStatus.dataset['kind'];
  }

  const defaultConventionInput = document.querySelector<HTMLInputElement>('#default-convention')!;

  document.querySelector<HTMLButtonElement>('#save-default-convention')!.addEventListener('click', () => {
    void (async () => {
      try {
        await setDefaultConvention(defaultConventionInput.value);
        setConventionStatus('Default convention updated.', 'success');
      } catch {
        setConventionStatus('Could not update the default convention (offline?).', 'error');
      }
    })();
  });

  const currentDefaultConvention = await getDefaultConvention();
  if (currentDefaultConvention !== undefined) defaultConventionInput.value = currentDefaultConvention;

  await loadRequests();
}

void main();
