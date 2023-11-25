import { createFolders, readFolders, updateFolder } from '@directus/sdk';
import { identity, isEqual, pickBy } from 'lodash-es';
import { BaseCommandOptions, DirectusClient } from './common';

type FolderItem = Record<string, any>;
type Filter<T> = Record<keyof T, any>;

export interface FoldersSnapshotOptions extends BaseCommandOptions {
  foldersFilter?: Filter<FolderItem>;
}

export async function snapshotFolders(client: DirectusClient, opts?: FoldersSnapshotOptions): Promise<FolderItem[]> {
  let folders: FolderItem[] = [];
  for (let p = 1; ; p++) {
    const response = await client.request(
      readFolders({
        page: p,
        sort: ['id'],
        filter: opts?.foldersFilter ?? {},
      }),
    );
    if (response.length === 0) {
      break;
    }
    folders = folders.concat(response);
  }
  return folders.map((folder: FolderItem) => pickBy(folder, identity)) as FolderItem[];
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
      const updated = await client.request(updateFolder(id, item));
      return updated!.id;
    }),
  );
}

async function createItems(client: DirectusClient, items: FolderItem[]): Promise<string[]> {
  const data = await client.request(createFolders(items));
  return data!.map((i) => i.id);
}
