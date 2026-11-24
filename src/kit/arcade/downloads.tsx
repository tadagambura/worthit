// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// "Game downloads": fetch every arcade game at once inside the app (handy before a flight or
// on Wi-Fi), or remove them to free space. Nobody leaves the app; scores and currency are kept.
import { useState } from 'react';
import { useFeedback } from '../feedback';
import { Button, Card, Muted, ProgressBar, Row, Strong } from '../ui';
import { downloadAll, downloadSummary, removeAllDownloads } from './packs';
import type { ArcadeCatalog, Pack } from './types';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DownloadsCard({ catalog, bundled }: { catalog: ArcadeCatalog; bundled: Record<string, Pack> }) {
  const { toast } = useFeedback();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [, refresh] = useState(0);
  const s = downloadSummary(catalog.app, catalog.games, bundled);

  const getAll = async () => {
    const r = await downloadAll(catalog.app, catalog.games, bundled, (done, total) => setProgress({ done, total }));
    setProgress(null);
    refresh((n) => n + 1);
    toast(r.failed ? `${r.downloaded} downloaded, ${r.failed} didn't. Check your connection and try again.` : 'Every game is on your phone. Play offline any time.');
  };

  return (
    <Card testID="arcade-downloads">
      <Row style={{ justifyContent: 'space-between' }}>
        <Strong>Game downloads</Strong>
        <Muted testID="downloads-count">{`${s.onPhone} of ${s.total} on this phone`}</Muted>
      </Row>
      {progress ? (
        <ProgressBar value={progress.total ? progress.done / progress.total : 1} label={`Downloading ${progress.done} of ${progress.total} games`} />
      ) : s.toDownload > 0 ? (
        <>
          <Muted>{`Games download when you first play them. Get the other ${s.toDownload} now (${formatBytes(s.bytesToDownload)}) to play offline.`}</Muted>
          <Button title={`Download all (${formatBytes(s.bytesToDownload)})`} icon="cloud-download-outline" small onPress={getAll} testID="downloads-all" />
        </>
      ) : (
        <Muted>Every game is downloaded and works offline.</Muted>
      )}
      {!progress && s.onPhone > Object.keys(bundled).length ? (
        <Button
          title="Remove downloaded games"
          variant="ghost"
          small
          testID="downloads-remove"
          onPress={() => {
            removeAllDownloads(catalog.app, catalog.games);
            refresh((n) => n + 1);
            toast('Removed. Your scores and currency are safe; games re-download when you play.');
          }}
        />
      ) : null}
    </Card>
  );
}
