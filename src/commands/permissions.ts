import { Filter, PermissionItem, RoleItem } from '@directus/sdk';
import { identity, isEqual, omit, pickBy, uniq } from 'lodash-es';
import { BaseCommandOptions, DirectusClient } from './common';

export interface PermissionsSnapshotOptions extends BaseCommandOptions {
  rolesFilter?: Filter<RoleItem>;
}

type CustomPermissionItem = Omit<PermissionItem, 'role' | 'collection' | 'action'>;
type CustomRoleItem = Partial<RoleItem> & { permits: RolePermissions };
type RolePermissions = {
  [collection: string]: {
    [action: string]: CustomPermissionItem;
  };
};

interface FetchRemoteRolePermissionsOpts {
  includeId?: boolean;
}

async function fetchRemoteRolePermissions(
  roleId,
  client: DirectusClient,
  opts?: FetchRemoteRolePermissionsOpts,
): Promise<RolePermissions> {
  const filter = roleId ? { role: { _eq: roleId } } : { role: { _null: true } };
  const response = await client.permissions.readByQuery({ limit: -1, filter });
  if (!response.data) {
    throw new Error('No response received while fetching permissions!');
  }
  return response.data.reduce((acc, { id, collection, action, fields, ...rest }) => {
    const serialized: CustomPermissionItem = {
      ...pickBy(rest, identity),
      fields: fields?.sort(),
      id: opts?.includeId ? id : undefined,
    };
    if (Object.keys(serialized).length > 0 && collection && action) {
      if (!acc[collection]) {
        acc[collection] = {};
      }
      acc[collection][action] = serialized;
    } else if (!collection || !action) {
      console.log(`  [permissions] Skipping permission "${id}" because of missing collection or action`);
    }
    return acc;
  }, {});
}

export async function snapshotPermissions(
  client: DirectusClient,
  opts: PermissionsSnapshotOptions,
): Promise<CustomRoleItem[]> {
  const result = await client.roles.readByQuery({
    limit: -1,
    sort: ['id'],
    fields: ['id', 'name', 'icon', 'description', 'ip_access', 'enforce_tfa', 'admin_access', 'app_access'],
    filter: opts.rolesFilter ?? {},
  });
  if (!result.data) {
    throw new Error('No response received while fetching roles!');
  }
  // add a `null` role to handle public permissions, which have no roles:
  const roles = [...result.data, { id: null } as unknown as RoleItem];
  return Promise.all(
    roles.map(async (role: RoleItem) => {
      const permits = await fetchRemoteRolePermissions(role.id, client);
      return {
        ...pickBy(role, (v) => v !== undefined),
        permits,
      };
    }),
  );
}

export async function applyPermissionsSnapshot(client: DirectusClient, snapshot: CustomRoleItem[]) {
  const { data: existingRoles } = await client.roles.readByQuery({ limit: -1 });
  for (const snapshotRole of snapshot) {
    const existingRole = snapshotRole.id ? await upsertRole(snapshotRole, existingRoles!, client) : null;
    const existingPermits = await fetchRemoteRolePermissions(existingRole?.id, client, { includeId: true });
    const allCollections = uniq(Object.keys(existingPermits).concat(Object.keys(snapshotRole.permits)));
    for (const collection of allCollections) {
      const snapshotActions = snapshotRole.permits[collection] || {};
      const existingActions = existingPermits[collection] || {};
      await syncActions({ role: existingRole?.id, collection }, existingActions, snapshotActions, client);
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
  console.log(`  [permissions] Creating role "${snapshotRole.name}"`);
  const newRole = await client.roles.createOne(omit(snapshotRole, 'permits'));
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
    console.log('  [permissions] Creating permission', role, collection, action);
    await client.permissions.createOne({ role, collection, action, ...snapshot });
  } else if (!snapshot) {
    console.log('  [permissions] Deleting permission', role, collection, action);
    await client.permissions.deleteOne(existing.id);
  } else {
    const attributes = diffObjects(existing, snapshot);
    if (Object.keys(attributes).length === 0) {
      console.debug('  [permissions] Skipping permission update', role, collection, action);
      return;
    }
    console.log('  [permissions] Updating permission %s %s %s with %j', role, collection, action, attributes);
    await client.permissions.updateOne(existing.id, attributes);
  }
}
