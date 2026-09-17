import FileSaver from 'file-saver';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function saveFile(blob: Blob, fileName: string): Promise<void> {
  if (!isTauri) {
    FileSaver.saveAs(blob, fileName);
    return;
  }

  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile } = await import('@tauri-apps/plugin-fs');

  const filePath = await save({
    defaultPath: fileName,
    filters: [{ name: 'File', extensions: [getExt(fileName)] }],
  });

  if (filePath === null) return;

  const buffer = await blob.arrayBuffer();
  await writeFile(filePath, new Uint8Array(buffer));
}

function getExt(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx + 1) : '*';
}
