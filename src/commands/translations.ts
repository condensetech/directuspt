import axios from 'axios';
import { sortBy } from 'lodash-es';
import { DirectusClient } from './common';

export async function snapshotTranslations(client: DirectusClient) {
  const response = await axios.get(`${client.url}/translations`, {
    headers: {
      Authorization: `Bearer ${await client.auth.token}`,
      'Content-Type': 'application/json',
    },
  });
  return sortBy(response.data.data, (d) => `${d.key}/${d.language}`).map(({ id, ...rest }) => rest);
}
