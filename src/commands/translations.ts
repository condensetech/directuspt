import { Auth, Directus, TypeMap } from '@directus/sdk';
import axios from 'axios';
import { sortBy } from 'lodash-es';

export async function snapshotTranslations(client: Directus<TypeMap, Auth>) {
  const response = await axios.get(`${client.url}/translations`, {
    headers: {
      Authorization: `Bearer 1${await client.auth.token}`,
      'Content-Type': 'application/json',
    },
  });
  return sortBy(response.data.data, (d) => `${d.key}/${d.language}`).map(({ id, ...rest }) => rest);
}
