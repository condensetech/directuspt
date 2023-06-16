import { pickBy, identity } from 'lodash-es';
import { Auth, Directus, Filter, TypeMap, RoleItem } from '@directus/sdk';
import { BaseCommandOptions } from './common';

export interface PermissionsSnapshotOptions extends BaseCommandOptions {
  rolesFilter?: Filter<RoleItem>;
}

async function fetchRemoteRolePermissions(roleId, client: Directus<TypeMap, Auth>) {
  const response = await client.permissions.readByQuery({
    limit: -1,
    filter: { role: { _eq: roleId } },
  });
  if (!response.data) {
    throw new Error('No response received while fetching permissions!');
  }
  return response.data.reduce((acc, { id, collection, action, ...rest }) => {
    const serialized = pickBy(rest, identity);
    if (Object.keys(serialized).length > 0 && collection && action) {
      if (!acc[collection]) {
        acc[collection] = {};
      }
      acc[collection][action] = serialized;
    } else if (!collection || !action) {
      console.debug(`Skipping permission ${id} with missing collection or action`);
    }
    return acc;
  }, {});
}

export async function snapshotPermissions(client: Directus<TypeMap, Auth>, opts: PermissionsSnapshotOptions) {
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
        ...pickBy(role, identity),
        permits,
      };
    }),
  );
}
