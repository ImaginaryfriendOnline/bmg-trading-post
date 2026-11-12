import { downloadBlob } from './exportImage.ts';

export interface SaveFileType {
  description: string;
  accept: Record<string, string[]>;
}

/**
 * Prompts for a name and location via the browser's native save dialog, where
 * available (Chromium). Falls back to a plain anchor-download on browsers
 * without the File System Access API (Firefox, Safari).
 */
export async function saveFileAs(blob: Blob, suggestedName: string, type: SaveFileType): Promise<void> {
  const picker = window.showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName, types: [type] });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      // The user cancelling the dialog is not a failure worth falling back for.
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  downloadBlob(blob, suggestedName);
}
