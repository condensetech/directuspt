import fs from 'fs/promises';
import { BaseCommandOptions, DirectusClient, getClient } from '../common';
import { applySchemaSnapshot } from '../schema';
import { CommandSectionError } from '../../errors';
import { applyFoldersSnapshot } from '../folders';
import { applyPermissionsSnapshot } from '../permissions';
import { applyTranslationsSnapshot } from '../translations';
import { uniq } from 'lodash-es';

export type ApplyCommandOptions = BaseCommandOptions & {
  src: string;
  snapshots: string[];
};

interface ApplyPromise {
  (client: DirectusClient, snapshot): Promise<unknown>;
}

async function readSnapshot(name: string, folder: string): Promise<[unknown, string]> {
  try {
    const data = await fs.readFile(`${folder}/${name}.json`, 'utf8');
    const json = JSON.parse(data);
    console.log(`  [${name}] OK`);
    return [json, name];
  } catch (e) {
    throw new CommandSectionError(`  [${name}] Apply operation failed`, e);
  }
}

const applyPromisesRouter: Record<string, ApplyPromise> = {
  schema: applySchemaSnapshot,
  translations: applyTranslationsSnapshot,
  permissions: applyPermissionsSnapshot,
  folders: applyFoldersSnapshot,
};

async function applySnapshot(name: string, client: DirectusClient, snapshot: unknown) {
  try {
    await applyPromisesRouter[name](client, snapshot);
    console.log(`  [${name}] OK`);
  } catch (e) {
    throw new CommandSectionError(`  [${name}] Apply operation failed`, e);
  }
}

export async function apply(opts: ApplyCommandOptions) {
  const client = await getClient(opts);
  console.log('Reading snapshots...');
  const readPromises = uniq(opts.snapshots).map((name) => readSnapshot(name, opts.src));
  const snapshots = await Promise.all(readPromises);
  console.log('Applying snapshots...');
  await Promise.all(
    snapshots.map(async ([data, name]) => {
      await applySnapshot(name, client, data);
    }),
  );
  console.log('Done!');
}
