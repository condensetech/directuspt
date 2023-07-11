import fs from 'fs/promises';
import { BaseCommandOptions, DirectusClient, ResourceType, getClient, getRequestedResourceTypes } from '../common';
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

type SnapshotHandler = (client: DirectusClient, opts: SnapshotCommandOptions) => Promise<unknown>;

async function tryMkdir(path: string) {
  try {
    await fs.mkdir(path, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
}

const fetchSnapshotRouter: Record<ResourceType, SnapshotHandler> = {
  [ResourceType.SCHEMA]: snapshotSchema,
  [ResourceType.TRANSLATIONS]: snapshotTranslations,
  [ResourceType.PERMISSIONS]: snapshotPermissions,
  [ResourceType.FOLDERS]: snapshotFolders,
};

async function fetchSnapshot(
  type: ResourceType,
  client: DirectusClient,
  opts: SnapshotCommandOptions,
): Promise<[ResourceType, unknown]> {
  try {
    const data = await fetchSnapshotRouter[type](client, opts);
    console.log(`  [${type}] OK`);
    return [type, data];
  } catch (e) {
    throw new CommandSectionError(`  [${name}] Snapshot operation failed`, e);
  }
}

async function writeSnapshot(type: ResourceType, data: unknown, opts: SnapshotCommandOptions) {
  await fs.writeFile(`${opts.dest}/${type}.json`, JSON.stringify(data, null, 2));
  console.log(`  [${type}] OK`);
}

export async function snapshot(opts: SnapshotCommandOptions) {
  const resources = getRequestedResourceTypes(opts);
  const client = await getClient(opts);
  await tryMkdir(opts.dest);
  console.log('Generating snapshots...');
  const snapshots = await Promise.all(resources.map((type) => fetchSnapshot(type, client, opts)));
  console.log('Writing snapshots...');
  await Promise.all(snapshots.map((args) => writeSnapshot(...args, opts)));
  console.log('Done!');
}
