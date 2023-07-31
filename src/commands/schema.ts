import { DirectusClient } from './common';
import { isEmpty } from 'lodash-es';
import { SchemaDiffOutput, SchemaSnapshotOutput, schemaApply, schemaDiff, schemaSnapshot } from '@directus/sdk';

export async function snapshotSchema(client: DirectusClient) {
  return client.request(schemaSnapshot());
}

export async function applySchemaSnapshot(client: DirectusClient, snapshot: SchemaSnapshotOutput) {
  const diff = await diffSchema(client, snapshot);
  if (isEmpty(diff)) {
    console.log('  [schema] Skipping because there is no difference');
    return;
  }
  return applySchema(client, diff);
}

async function diffSchema(client: DirectusClient, snapshot: SchemaSnapshotOutput) {
  return client.request(schemaDiff(snapshot));
}

async function applySchema(client: DirectusClient, diff: SchemaDiffOutput) {
  return client.request(schemaApply(diff));
}
