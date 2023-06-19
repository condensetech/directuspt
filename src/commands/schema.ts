import { Auth, Directus, TypeMap } from '@directus/sdk';
import axios from 'axios';

export async function snapshotSchema(client: Directus<TypeMap, Auth>) {
  const response = await axios.get(`${client.url}/schema/snapshot?export=json`, {
    headers: {
      Authorization: `Bearer ${await client.auth.token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}
