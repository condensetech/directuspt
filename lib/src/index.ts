import { Command, InvalidArgumentError, Option } from 'commander';
import { Filter } from '@directus/types';
import { snapshot } from './commands/snapshot';
import { apply } from './commands/apply';
export * from './errors';

export enum ResourceType {
  SCHEMA = 'schema',
  FOLDERS = 'folders',
  PERMISSIONS = 'permissions',
  TRANSLATIONS = 'translations',
}

const parseResourceTypes = (value: string): ResourceType[] =>
  value.split(',').map((v) => {
    const value = v.trim().toLowerCase() as ResourceType;
    if (!Object.values(ResourceType).includes(value as ResourceType)) {
      throw new InvalidArgumentError(`Allowed values are: ${Object.values(ResourceType).join(', ')}`);
    }
    return value;
  });

const parseFilter = (value: any): Filter => {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (e) {
    console.log(e);
    throw new InvalidArgumentError('Not a json object');
  }
  if (typeof parsed !== 'object') {
    throw new InvalidArgumentError('Argument should be an object or an array');
  }
  return parsed as Filter;
};

const decorateCommandWithCommonOptions = (command: Command): Command =>
  command
    .addOption(
      new Option('-t, --token <token>', 'Directus API token')
        .conflicts(['email', 'password', 'otp'])
        .env('DIRECTUS_TOKEN'),
    )
    .addOption(new Option('--except <resources>', 'Resources to exclude').argParser(parseResourceTypes))
    .addOption(
      new Option('--only <resources>', 'Resources to include').argParser(parseResourceTypes).conflicts(['except']),
    )
    .addOption(new Option('-e, --email <email>', 'Directus user email').env('DIRECTUS_USER_EMAIL'))
    .addOption(new Option('-p, --password <password>', 'Directus user password').env('DIRECTUS_USER_PASSWORD'))
    .addOption(new Option('-o, --otp <otp>', 'Directus user OTP').env('DIRECTUS_USER_OTP'))
    .addOption(new Option('-H, --host <host>', 'Directus host').default('http://localhost:8055').env('DIRECTUS_HOST'));

export const addSnapshotCommand = (program: Command) => {
  decorateCommandWithCommonOptions(program.command('snapshot').description('Snapshot a Directus instance'))
    .option(
      '--roles-filter <filter>',
      'Additional filter expressed in directus JSON format to apply on permission roles',
      parseFilter,
    )
    .option(
      '--folders-filter <filter>',
      'Additional filter expressed in directus JSON format to apply on folders',
      parseFilter,
    )
    .addOption(new Option('-d, --dest <path>', 'Output directory').default('./snapshot'))
    .action(async (opts) => {
      await snapshot(opts);
      process.exit(0);
    });
};

export const addApplyCommand = (program: Command) => {
  decorateCommandWithCommonOptions(program.command('apply').description('Apply snapshots to a Directus instance'))
    .addOption(new Option('-s, --src <path>', 'Source directory').default('./snapshot'))
    .action(async (opts) => {
      await apply(opts);
      process.exit(0);
    });
};

export const addCommands = (program: Command) => {
  addSnapshotCommand(program);
  addApplyCommand(program);
};
