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

async function main(): Promise<void> {
  await ensureUnlocked('admin');

  const tbody = document.querySelector<HTMLTableSectionElement>('#requests-tbody')!;
  const passwordStatus = document.querySelector<HTMLDivElement>('#password-status')!;

  function setPasswordStatus(message: string, kind: 'success' | 'error' | '' = ''): void {
    passwordStatus.textContent = message;
    if (kind) passwordStatus.dataset['kind'] = kind;
    else delete passwordStatus.dataset['kind'];
  }

  async function loadRequests(): Promise<void> {
    const snap = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc')));
    tbody.innerHTML = '';
    for (const requestDoc of snap.docs) {
      const data = requestDoc.data() as PlayerRequestDoc;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(data.player)}</td>
        <td>${escapeHtml(data.character)}</td>
        <td>${new Date(data.createdAt).toLocaleString()}</td>
        <td>${escapeHtml(data.status)}</td>
        <td><a href="index.html#req=${requestDoc.id}" target="_blank" rel="noopener">Open</a></td>
        <td><button type="button" class="secondary delete-row" data-id="${requestDoc.id}">Delete</button></td>
      `;
      tbody.append(row);
    }

    tbody.querySelectorAll<HTMLButtonElement>('.delete-row').forEach((button) => {
      button.addEventListener('click', () => {
        void (async () => {
          await deleteDoc(doc(db, 'requests', button.dataset['id']!));
          await loadRequests();
        })();
      });
    });
  }

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
