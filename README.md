# Directus Power Tools

To install: `npm i -g directuspt`

## Commands

- help: `directuspt --help`
- snapshot: `directuspt snapshot`

### Common options

- Directus host can be set via `-H, --host` option or via the env variable `DIRECTUS_HOST`. By default `http://localhost:8055` is used.

#### Authentication via email, password, otp

Credentials can be provided via `-e, --email`, `-p, --password`, `-o, --otp`, or via the environment variables `DIRECTUS_USER_EMAIL`, `DIRECTUS_USER_PASSWORD`, `DIRECTUS_USER_OTP`. The latter should be preferred to avoid exposing the password.

#### Authentication via static token

A static token can be provided via `-t, --token`, or via the environment variable `DIRECTUS_TOKEN`.

### Snapshot

It snapshots schema, translations, permissions and folders as json files in the given `dest` path.
Additional options are:

- `-d, --dest` to set the destination path (`./snapshot` by default);
- `--roles-filter` to set an additional filter when selecting roles to snapshot;
- `--folders-filter` to set an additional filter when selecting folders to snapshot.

### Apply

It applies any schema, translations, permissions, and folders json snapshots found in the given `src` path.
Additional options are:

- `-s, --src` to set the source path (`./snapshot` by default);
