import { Filter, FolderItem } from '@directus/sdk';
import { identity, pickBy } from 'lodash-es';
import { BaseCommandOptions, DirectusClient } from './common';

export interface FoldersSnapshotOptions extends BaseCommandOptions {
  rolesFilter?: Filter<FolderItem>;
}

export async function snapshotFolders(client: DirectusClient, opts: FoldersSnapshotOptions) {
  const folders = await client.folders.readByQuery({
    limit: -1,
    sort: ['id'],
    filter: opts.rolesFilter ?? {},
  });
  if (!folders.data) {
    throw new Error('No response received while fetching folders!');
  }
  return folders.data.map((folder: FolderItem) => pickBy(folder, identity));
}
