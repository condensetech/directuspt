import fs from 'fs/promises';
import { BaseCommandOptions, getClient } from '../common';
import { FoldersSnapshotOptions, snapshotFolders } from '../folders';
import { PermissionsSnapshotOptions, snapshotPermissions } from '../permissions';
import { snapshotSchema } from '../schema';
import { snapshotTranslations } from '../translations';
import { CommandSectionError } from '../../errors';

export type SnapshotCommandOptions = BaseCommandOptions &
  FoldersSnapshotOptions &
  PermissionsSnapshotOptions & {
    dest: string;
  };

async function tryMkdir(path: string) {
  try {
    await fs.mkdir(path, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
}

async function fetchSnapshot(name: string, fetchPromise: Promise<unknown>): Promise<[unknown, string]> {
  try {
    const data = await fetchPromise;
    console.log(`  [${name}] OK`);
    return [data, name];
  } catch (e) {
    throw new CommandSectionError(`  [${name}] Snapshot operation failed`, e);
  }
}

export async function snapshot(opts: SnapshotCommandOptions) {
  const client = await getClient(opts);
  await tryMkdir(opts.dest);
  console.log('Generating snapshots...');
  const snapshots = await Promise.all([
    fetchSnapshot('schema', snapshotSchema(client)),
    fetchSnapshot('translations', snapshotTranslations(client)),
    fetchSnapshot('permissions', snapshotPermissions(client, opts)),
    fetchSnapshot('folders', snapshotFolders(client, opts)),
  ]);
  console.log('Writing snapshots...');
  await Promise.all(
    snapshots.map(async ([data, name]) => {
      await fs.writeFile(`${opts.dest}/${name}.json`, JSON.stringify(data, null, 2));
      console.log(`  [${name}] OK`);
    }),
  );
  console.log('Done!');
}
