import { Filter, FolderItem } from '@directus/sdk';
import { identity, isEqual, pickBy } from 'lodash-es';
import { BaseCommandOptions, DirectusClient } from './common';

export interface FoldersSnapshotOptions extends BaseCommandOptions {
  foldersFilter?: Filter<FolderItem>;
}

export async function snapshotFolders(client: DirectusClient, opts?: FoldersSnapshotOptions): Promise<FolderItem[]> {
  const folders = await client.folders.readByQuery({
    limit: -1,
    sort: ['id'],
    filter: opts?.foldersFilter ?? {},
  });
  if (!folders.data) {
    throw new Error('No response received while fetching folders!');
  }
  return folders.data.map((folder: FolderItem) => pickBy(folder, identity)) as FolderItem[];
}

export async function applyFoldersSnapshot(client: DirectusClient, snapshot: FolderItem[]) {
  const existing = await snapshotFolders(client);
  let dataToSync = [...snapshot];
  let itemsToSync = dataToSync.filter((item) => !item.parent);

  do {
    const syncedItemIds = await syncItems(client, itemsToSync, existing);
    dataToSync = dataToSync.filter((item) => !syncedItemIds.includes(item.id));
    itemsToSync = dataToSync.filter((item) => syncedItemIds.includes(item.parent));
  } while (dataToSync.length > 0);
}

async function syncItems(client: DirectusClient, items: FolderItem[], existing: FolderItem[]): Promise<string[]> {
  const toUpdate: FolderItem[] = [];
  const toAdd: FolderItem[] = [];
  const ignoredIds: string[] = [];

  for (const item of items) {
    const existingItem = item.id
      ? existing.find((i) => i.id === item.id)
      : existing.find((i) => i.name === item.name && i.parent === item.parent);
    if (existingItem) {
      const toUpdateItem = { ...item, id: existingItem.id };
      if (isEqual(existingItem, toUpdateItem)) {
        console.log('  [folders] Skipping update of "%s"', item.name);
        ignoredIds.push(item.id);
      } else {
        console.log('  [folders] Updating "%s"', item.name);
        toUpdate.push({ ...item, id: existingItem.id });
      }
    } else {
      console.log('  [folders] Creating "%s"', item.name);
      toAdd.push(item);
    }
  }

  const updatedIds = await updateItems(client, toUpdate);
  const addedIds = await createItems(client, toAdd);
  const syncedItemIds = [...updatedIds, ...addedIds];

  return syncedItemIds.concat(ignoredIds);
}

async function updateItems(client: DirectusClient, items: FolderItem[]): Promise<string[]> {
  return Promise.all(
    items.map(async ({ id, ...item }) => {
      const updated = await client.folders.updateOne(id, item);
      return updated!.id;
    }),
  );
}

async function createItems(client: DirectusClient, items: FolderItem[]): Promise<string[]> {
  const { data } = await client.folders.createMany(items);
  return data!.map((i) => i.id);
}
