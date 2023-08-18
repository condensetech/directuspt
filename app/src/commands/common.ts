import { Auth, Directus, TypeMap } from '@directus/sdk';

export enum ResourceType {
  SCHEMA = 'schema',
  FOLDERS = 'folders',
  PERMISSIONS = 'permissions',
  TRANSLATIONS = 'translations',
}

export interface BaseCommandOptions {
  token?: string;
  email?: string;
  password?: string;
  otp?: string;
  host: string;
  only?: ResourceType[];
  except?: ResourceType[];
}

export function getRequestedResourceTypes(opts: BaseCommandOptions): ResourceType[] {
  const resourceTypeList = Object.values(ResourceType);
  if (opts.only) {
    return resourceTypeList.filter((type) => opts.only?.includes(type));
  }
  if (opts.except) {
    return resourceTypeList.filter((type) => !opts.except?.includes(type));
  }
  return resourceTypeList;
}

export type DirectusClient = Directus<TypeMap, Auth>;

export async function getClient(opts: BaseCommandOptions): Promise<DirectusClient> {
  const client = new Directus(opts.host);
  if (opts.token) {
    await client.auth.static(opts.token);
  } else if (opts.email && opts.password) {
    await client.auth.login({
      email: opts.email,
      password: opts.password,
      otp: opts.otp,
    });
  }
  return client;
}
