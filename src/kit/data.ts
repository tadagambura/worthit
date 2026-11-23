// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// "Your data" controls: export everything as JSON, delete everything. Both are local because
// the data only lives on the device.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { track } from './analytics';
import { kv } from './storage';
import { storedKeys, wipeAll } from './store';

export function buildExport(app: string, version: string): string {
  const data: Record<string, unknown> = {};
  for (const k of storedKeys(app)) {
    if (k.includes('.analytics.') || k.includes('.premium.')) continue;
    const raw = kv.get(k);
    try {
      data[k] = raw ? JSON.parse(raw) : null;
    } catch {
      data[k] = raw;
    }
  }
  return JSON.stringify({ app, version, exportedAt: new Date().toISOString(), data }, null, 2);
}

/** Save or share a text file: a download on web, the share sheet on phones. */
export async function exportFile(name: string, content: string, mimeType: string): Promise<{ ok: boolean; message: string }> {
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(content);
      if (!(await Sharing.isAvailableAsync())) return { ok: false, message: "Sharing isn't available on this device." };
      await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
    }
    return { ok: true, message: 'Export ready.' };
  } catch {
    return { ok: false, message: "Couldn't export. Please try again." };
  }
}

export async function exportData(app: string, version: string): Promise<{ ok: boolean; message: string }> {
  const r = await exportFile(`${app}-export-${new Date().toISOString().slice(0, 10)}.json`, buildExport(app, version), 'application/json');
  if (r.ok) track('data_exported', { format: 'json' });
  return r;
}

export function deleteAllData(app: string) {
  track('data_deleted');
  wipeAll(app);
}
