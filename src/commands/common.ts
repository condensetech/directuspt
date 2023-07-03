import { Auth, Directus, TypeMap } from '@directus/sdk';

export interface BaseCommandOptions {
  token?: string;
  email?: string;
  password?: string;
  otp?: string;
  host: string;
}

export type DirectusClient = Directus<TypeMap, Auth>;

export async function getClient(opts: BaseCommandOptions): Promise<DirectusClient> {
  const client = new Directus(opts.host);
  if (opts.token) {
    await client.auth.static(opts.token);
  } else if (opts.email && opts.password && opts.otp) {
    await client.auth.login({
      email: opts.email,
      password: opts.password,
      otp: opts.otp,
    });
  }
  return client;
}
