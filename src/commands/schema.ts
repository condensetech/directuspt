import axios from 'axios';
import { DirectusClient } from './common';

export async function snapshotSchema(client: DirectusClient) {
  const response = await axios.get(`${client.url}/schema/snapshot?export=json`, {
    headers: {
      Authorization: `Bearer ${await client.auth.token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

export async function applySchemaSnapshot(client: DirectusClient, snapshot: unknown) {
  const diff = await diffSchema(client, snapshot);
  return applySchema(client, diff.data);
}

export async function diffSchema(client: DirectusClient, snapshot: unknown) {
  const response = await axios.post(`${client.url}/schema/diff`, snapshot, {
    headers: {
      Authorization: `Bearer ${await client.auth.token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

export async function applySchema(client: DirectusClient, diff: unknown) {
  const response = await axios.post(`${client.url}/schema/apply`, diff, {
    headers: {
      Authorization: `Bearer ${await client.auth.token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}
