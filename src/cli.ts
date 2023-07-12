import { program, Command, Option, InvalidArgumentError } from 'commander';
import { printError } from './errors';
import { Filter, FolderItem, RoleItem } from '@directus/sdk';
import { snapshot } from './commands/snapshot';
import { apply } from './commands/apply';
import { ResourceType } from './commands/common';

function getPackageVersionSync() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { version } = require('../package.json');
  return version;
}

function parseFilter<T>(value): Filter<T> {
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
  return parsed as Filter<T>;
}

function parseResourceTypes(value: string): ResourceType[] {
  return value.split(',').map((v) => {
    const value = v.trim().toLowerCase() as ResourceType;
    if (!Object.values(ResourceType).includes(value as ResourceType)) {
      throw new InvalidArgumentError(`Allowed values are: ${Object.values(ResourceType).join(', ')}`);
    }
    return value;
  });
}

function decorateCommandWithCommonOptions(command: Command): Command {
  return command
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
}

program
  .name('directuspt')
  .description('Directus CLI Tool to help with snapshotting, seeding, and more.')
  .version(getPackageVersionSync());

decorateCommandWithCommonOptions(program.command('snapshot').description('Snapshot a Directus instance'))
  .option(
    '--roles-filter <filter>',
    'Additional filter expressed in directus JSON format to apply on permission roles',
    parseFilter<RoleItem>,
  )
  .option(
    '--folders-filter <filter>',
    'Additional filter expressed in directus JSON format to apply on folders',
    parseFilter<FolderItem>,
  )
  .addOption(new Option('-d, --dest <path>', 'Output directory').default('./snapshot'))
  .action(snapshot);

decorateCommandWithCommonOptions(program.command('apply').description('Apply snapshots to a Directus instance'))
  .addOption(new Option('-s, --src <path>', 'Source directory').default('./snapshot'))
  .action(apply);

export const run = async () => {
  try {
    await program.parseAsync(process.argv);
  } catch (e) {
    printError(e);
    process.exit(1);
  }
};
