import fs from 'fs/promises';
import { BaseCommandOptions, DirectusClient, ResourceType, getClient, getRequestedResourceTypes } from '../common';
import { applySchemaSnapshot } from '../schema';
import { CommandSectionError } from '../../errors';
import { applyFoldersSnapshot } from '../folders';
import { applyPermissionsSnapshot } from '../permissions';
import { applyTranslationsSnapshot } from '../translations';

export type ApplyCommandOptions = BaseCommandOptions & {
  src: string;
};

type ApplyHandler = (client: DirectusClient, snapshot: any) => Promise<unknown>;

async function readSnapshot(type: ResourceType, opts: ApplyCommandOptions): Promise<[ResourceType, unknown]> {
  try {
    const data = await fs.readFile(`${opts.src}/${type}.json`, 'utf8');
    const json = JSON.parse(data);
    console.log(`  [${type}] OK`);
    return [type, json];
  } catch (e) {
    throw new CommandSectionError(`  [${type}] Apply operation failed`, e);
  }
}

const applySnapshotRouter: Record<ResourceType, ApplyHandler> = {
  [ResourceType.SCHEMA]: applySchemaSnapshot,
  [ResourceType.TRANSLATIONS]: applyTranslationsSnapshot,
  [ResourceType.PERMISSIONS]: applyPermissionsSnapshot,
  [ResourceType.FOLDERS]: applyFoldersSnapshot,
};

async function applySnapshot(type: ResourceType, snapshot: unknown, client: DirectusClient) {
  try {
    await applySnapshotRouter[type](client, snapshot);
    console.log(`  [${type}] OK`);
  } catch (e) {
    throw new CommandSectionError(`  [${type}] Apply operation failed`, e);
  }
}

export async function apply(opts: ApplyCommandOptions) {
  const resources = getRequestedResourceTypes(opts);
  const client = await getClient(opts);
  console.log('Reading snapshots...');
  const snapshots = await Promise.all(resources.map((type) => readSnapshot(type, opts)));
  console.log('Applying snapshots...');
  await Promise.all(
    snapshots.map(async (args) => {
      await applySnapshot(...args, client);
    }),
  );
  console.log('Done!');
}
