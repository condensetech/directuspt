import { authentication, createDirectus, rest, DirectusClient as BaseDirectusClient, RestClient } from '@directus/sdk';

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

export type DirectusClient = BaseDirectusClient<any> & RestClient<any>;

export async function getClient(opts: BaseCommandOptions): Promise<DirectusClient> {
  const client = createDirectus(opts.host).with(authentication()).with(rest());
  if (opts.token) {
    await client.setToken(opts.token);
  } else if (opts.email && opts.password) {
    await client.login(opts.email, opts.password, {
      mode: 'json',
      otp: opts.otp,
    });
  }
  return client;
}
