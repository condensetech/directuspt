import { Auth, Directus, Filter, FolderItem, TypeMap } from '@directus/sdk';
import { identity, pickBy } from 'lodash-es';
import { BaseCommandOptions } from './common';

export interface FoldersSnapshotOptions extends BaseCommandOptions {
  rolesFilter?: Filter<FolderItem>;
}

export async function snapshotFolders(client: Directus<TypeMap, Auth>, opts: FoldersSnapshotOptions) {
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
