import { sortBy } from 'lodash-es';
import { DirectusClient } from './common';
import { createTranslations, readTranslations, updateTranslations } from '@directus/sdk';

type CustomTranslationItem = Omit<TranslationItem, 'id'>;
type TranslationItem = {
  id: string;
  language: string;
  key: string;
  value: string;
};

export async function snapshotTranslations(client: DirectusClient): Promise<CustomTranslationItem[]> {
  return sortBy(await fetchTranslations(client), translationTuple).map(({ id, ...rest }) => rest);
}

export async function applyTranslationsSnapshot(client: DirectusClient, snapshot: CustomTranslationItem[]) {
  const existingItems = sortBy(await fetchTranslations(client), translationTuple);
  for (const snapshotItem of snapshot) {
    const snapshotTuple = translationTuple(snapshotItem);
    const matchedItem = existingItems.find((existingItem) => translationTuple(existingItem) === snapshotTuple);

    if (matchedItem) {
      const hasNewValue = snapshotItem.value !== matchedItem.value;

      if (hasNewValue) {
        console.log('  [translations] Updating translation "%s"', snapshotTuple);
        await updateTranslation(client, matchedItem.id, snapshotItem.value);
      } else {
        console.debug('  [translations] Skipping translation "%s"', snapshotTuple);
      }
    } else {
      console.log('  [translations] Creating translation "%s"', snapshotTuple);
      await createTranslation(client, snapshotItem);
    }
  }
}

async function fetchTranslations(client: DirectusClient): Promise<TranslationItem[]> {
  const pages: Array<TranslationItem[]> = [];
  const limit = 100;
  while (pages.length === 0 || pages[pages.length - 1].length === limit) {
    const items = await client.request(
      readTranslations({
        limit,
        page: pages.length + 1,
      }),
    );
    pages.push(items as TranslationItem[]);
  }
  return pages.flat();
}

async function createTranslation(client: DirectusClient, item: CustomTranslationItem) {
  await client.request(createTranslations([item]));
}

async function updateTranslation(client: DirectusClient, id: string, value: string) {
  // FIXME: forcing the type to be `TranslationItem` because the SDK typings are wrong
  await client.request(updateTranslations([id as unknown as number], { value }));
}

function translationTuple(t: TranslationItem | CustomTranslationItem): string {
  return `${t.key}/${t.language}`.toLowerCase();
}
