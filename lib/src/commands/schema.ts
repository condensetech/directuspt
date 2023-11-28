import * as sdk from '@directus/sdk';
import { DirectusClient } from './common';
import { isEmpty } from 'lodash-es';

export async function snapshotSchema(client: DirectusClient) {
  return client.request(sdk.schemaSnapshot());
}

export async function applySchemaSnapshot(client: DirectusClient, snapshot: sdk.SchemaSnapshotOutput) {
  const diff = await diffSchema(client, snapshot);
  if (isEmpty(diff)) {
    console.log('  [schema] Skipping because there is no difference');
    return;
  }
  return applySchema(client, diff);
}

async function diffSchema(client: DirectusClient, snapshot: sdk.SchemaSnapshotOutput) {
  return client.request(sdk.schemaDiff(snapshot));
}

async function applySchema(client: DirectusClient, diff: sdk.SchemaDiffOutput) {
  return client.request(sdk.schemaApply(diff));
}
