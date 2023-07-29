# DirectusPT

A CLI to help operate on Directus in a GitOps style.

To get started, install it with `npm i -g directuspt`

## Usage

### Snapshot

`directuspt snapshot` will snapshot directus schema, permissions, folders and translations as a set of json files.

Additional options are:

- `-d, --dest` to set the destination path (`./snapshot` by default);
- `--roles-filter {...}` to set an additional filter when selecting roles to snapshot;
- `--folders-filter {...}` to set an additional filter when selecting folders to snapshot;
- `--only [resource...]` csv list of resources to snapshot. Valid values are: schema,translations,permissions,folders
- `--except [resource...]` csv list of resources to exclude from the snapshot. Valid values are: schema,translations,permissions,folders

Example:

```
directuspt snapshot --roles-filter '{"admin_access":{"_eq":false}}' --except folders,schema
```

### Apply

It applies the snapshot taken with `directuspt snapshot`.

Additional options are:

- `-s, --src` to set the source path (`./snapshot` by default);
- `--only [resource...]` csv list of resources to snapshot. Valid values are: schema,translations,permissions,folders
- `--except [resource...]` csv list of resources to exclude from the snapshot. Valid values are: schema,translations,permissions,folders

Example:

```
directuspt apply --only permissions,translations
```



### Common options

- Directus host can be set via `-H, --host` option or via the env variable `DIRECTUS_HOST`. By default `http://localhost:8055` is used.
- User credentials can be provided via `-e, --email`, `-p, --password`, `-o, --otp`, or via the environment variables `DIRECTUS_USER_EMAIL`, `DIRECTUS_USER_PASSWORD`, `DIRECTUS_USER_OTP`. The latter should be preferred to avoid exposing the password.
- A user token can be provided via `-t, --token`, or via the environment variable `DIRECTUS_TOKEN`. The latter should be preferred to avoid exposing the token.

## TODO

Next steps:
- add flows and presets to the snapshots
- improve logging
- load config from file
- seed command
