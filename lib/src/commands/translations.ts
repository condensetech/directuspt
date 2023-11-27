import { sortBy } from 'lodash-es';
import { DirectusClient } from './common';
import { createTranslation, readTranslations, updateTranslation } from '@directus/sdk';

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
        await client.request(updateTranslation(matchedItem.id, { value: snapshotItem.value }));
      } else {
        console.debug('  [translations] Skipping translation "%s"', snapshotTuple);
      }
    } else {
      console.log('  [translations] Creating translation "%s"', snapshotTuple);
      await client.request(createTranslation(snapshotItem));
    }
  }
}

async function fetchTranslations(client: DirectusClient): Promise<TranslationItem[]> {
  let translations: TranslationItem[] = [];
  for (let p = 1; ; p++) {
    const data = await client.request<TranslationItem[]>(readTranslations({ page: p }));
    if (data.length === 0) {
      break;
    }
    translations = translations.concat(data);
  }
  return translations;
}

function translationTuple(t: TranslationItem | CustomTranslationItem): string {
  return `${t.key}/${t.language}`.toLowerCase();
}
