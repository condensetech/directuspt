import axios from 'axios';
import { sortBy } from 'lodash-es';
import { DirectusClient } from './common';

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
        console.log('  [translations] Skipping translation "%s"', snapshotTuple);
      }
    } else {
      console.log('  [translations] Creating translation "%s"', snapshotTuple);
      await createTranslation(client, snapshotItem);
    }
  }
}

async function fetchTranslations(client: DirectusClient): Promise<TranslationItem[]> {
  const {
    data: { data },
  } = await axios.get<{ data: TranslationItem[] }>(`${client.url}/translations`, {
    headers: {
      Authorization: `Bearer ${await client.auth.token}`,
      'Content-Type': 'application/json',
    },
  });
  return data;
}

async function createTranslation(client: DirectusClient, item: CustomTranslationItem) {
  await axios.post(`${client.url}/translations`, item, {
    headers: {
      Authorization: `Bearer ${await client.auth.token}`,
      'Content-Type': 'application/json',
    },
  });
}

async function updateTranslation(client: DirectusClient, id: string, value: string) {
  await axios.patch(
    `${client.url}/translations/${id}`,
    { value },
    {
      headers: {
        Authorization: `Bearer ${await client.auth.token}`,
        'Content-Type': 'application/json',
      },
    },
  );
}

function translationTuple(t: TranslationItem | CustomTranslationItem): string {
  return `${t.key}/${t.language}`;
}
