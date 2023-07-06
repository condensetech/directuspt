import { pickBy, identity, uniq, isEqual, omit } from 'lodash-es';
import { Filter, PermissionItem, RoleItem } from '@directus/sdk';
import { BaseCommandOptions, DirectusClient } from './common';

export interface PermissionsSnapshotOptions extends BaseCommandOptions {
  rolesFilter?: Filter<RoleItem>;
}

type CustomPermissionItem = Omit<PermissionItem, 'id' | 'collection' | 'action'>;
type CustomRoleItem = Partial<RoleItem> & { permits: RolePermissions };
type RolePermissions = {
  [collection: string]: {
    [action: string]: CustomPermissionItem;
  };
};

async function fetchRemoteRolePermissions(roleId, client: DirectusClient): Promise<RolePermissions> {
  const response = await client.permissions.readByQuery({
    limit: -1,
    filter: { role: { _eq: roleId } },
  });
  if (!response.data) {
    throw new Error('No response received while fetching permissions!');
  }
  return response.data.reduce((acc, { role, collection, action, ...rest }) => {
    const serialized: CustomPermissionItem = pickBy(rest, identity);
    if (Object.keys(serialized).length > 0 && collection && action) {
      if (!acc[collection]) {
        acc[collection] = {};
      }
      acc[collection][action] = serialized;
    } else if (!collection || !action) {
      console.log(`  [permissions] Skipping permission "${rest.id}" with missing collection or action`);
    }
    return acc;
  }, {});
}

export async function snapshotPermissions(
  client: DirectusClient,
  opts: PermissionsSnapshotOptions,
): Promise<CustomRoleItem[]> {
  const roles = await client.roles.readByQuery({
    limit: -1,
    sort: ['id'],
    fields: ['id', 'name', 'icon', 'description', 'ip_access', 'enforce_tfa', 'admin_access', 'app_access'],
    filter: opts.rolesFilter ?? {},
  });
  if (!roles.data) {
    throw new Error('No response received while fetching roles!');
  }
  return Promise.all(
    roles.data.map(async (role: RoleItem) => {
      const permits = await fetchRemoteRolePermissions(role.id, client);
      return {
        ...pickBy<RoleItem>(role, identity),
        permits,
      };
    }),
  );
}

export async function applyPermissionsSnapshot(client: DirectusClient, snapshot: CustomRoleItem[]) {
  const { data: existingRoles } = await client.roles.readByQuery({ limit: -1 });
  for (const snapshotRole of snapshot) {
    const existingRole = await upsertRole(snapshotRole, existingRoles!, client);
    const existingPermits = await fetchRemoteRolePermissions(existingRole.id, client);
    const allCollections = uniq(Object.keys(existingPermits).concat(Object.keys(snapshotRole.permits)));
    for (const collection of allCollections) {
      const snapshotActions = snapshotRole.permits[collection] || {};
      const existingActions = existingPermits[collection] || {};
      await syncActions({ role: existingRole.id, collection }, existingActions, snapshotActions, client);
    }
  }
}

async function upsertRole(
  snapshotRole: CustomRoleItem,
  existingRoles: RoleItem[],
  client: DirectusClient,
): Promise<RoleItem> {
  const existingRole = snapshotRole.id
    ? existingRoles.find((r) => r.id === snapshotRole.id)
    : existingRoles.find((r) => r.name === snapshotRole.name);
  if (existingRole) {
    await updateRoleIfNeeded(existingRole, snapshotRole, client);
    return existingRole;
  }
  const newRole = await client.roles.createOne(omit(snapshotRole, 'permits'));
  console.log(`  [permissions] Created role "${newRole!.id}"`);
  return newRole!;
}

async function updateRoleIfNeeded(
  { id: existingId, ...existingRole },
  { id: snapshotId, permits, ...snapshotRole }: CustomRoleItem,
  client: DirectusClient,
) {
  const attributes: Partial<RoleItem> = diffObjects(existingRole, snapshotRole);
  if (Object.keys(attributes).length === 0) {
    console.log(`  [permissions] Skipping role update "${existingId}"`);
    return;
  }
  await client.roles.updateOne(existingId, attributes);
  console.log('  [permissions] Updated role "%s" with %j', existingId, attributes);
}

function diffObjects(former, latest) {
  const formerKeys = Object.keys(former);
  const latestKeys = Object.keys(latest);
  return uniq(formerKeys.concat(latestKeys)).reduce((acc, key) => {
    if (
      (!formerKeys.includes(key) && latestKeys.includes(key)) ||
      (latestKeys.includes(key) &&
        ((Array.isArray(latest[key]) && !isEqual(former[key].sort(), latest[key].sort())) ||
          !isEqual(former[key], latest[key])))
    ) {
      acc[key] = latest[key];
    }
    return acc;
  }, {});
}

async function syncActions({ role, collection }, existingActions = {}, snapshotActions = {}, client: DirectusClient) {
  const existingActionNames = Object.keys(existingActions);
  const snapshotActionNames = Object.keys(snapshotActions);
  for (const action of uniq(existingActionNames.concat(snapshotActionNames))) {
    await syncAction({ role, collection, action }, existingActions[action], snapshotActions[action], client);
  }
}

async function syncAction({ role, collection, action }, existing, snapshot, client: DirectusClient) {
  if (!existing) {
    await client.permissions.createOne({ role, collection, action, ...snapshot });
    console.log('  [permissions] Created permission', role, collection, action);
  } else if (!snapshot) {
    await client.permissions.deleteOne(existing.id);
    console.log('  [permissions] Deleted permission', role, collection, action);
  } else {
    const attributes = diffObjects(existing, snapshot);
    if (Object.keys(attributes).length === 0) {
      console.log('  [permissions] Skipping permission update', role, collection, action);
      return;
    }
    await client.permissions.updateOne(existing.id, attributes);
    console.log('  [permissions] Updated permission %s %s %s with %j', role, collection, action, attributes);
  }
}
