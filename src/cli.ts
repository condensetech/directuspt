import { program, Command, Option, InvalidArgumentError } from 'commander';
import { printError } from './errors';
import { Filter, FolderItem, RoleItem } from '@directus/sdk';
import { snapshot } from './commands/snapshot';
import { apply } from './commands/apply';

const SNAPSHOT_NAMES = ['schema', 'translations', 'permissions', 'folders'];

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

function decorateCommandWithCommonOptions(command: Command): Command {
  return command
    .addOption(
      new Option('-t, --token <token>', 'Directus API token')
        .conflicts(['email', 'password', 'otp'])
        .env('DIRECTUS_TOKEN'),
    )
    .addOption(new Option('-e, --email <email>', 'Directus user email').env('DIRECTUS_USER_EMAIL'))
    .addOption(new Option('-p, --password <password>', 'Directus user password').env('DIRECTUS_USER_PASSWORD'))
    .addOption(new Option('-o, --otp <otp>', 'Directus user OTP').env('DIRECTUS_USER_OTP'))
    .addOption(new Option('-H, --host <host>', 'Directus host').default('http://localhost:8055').env('DIRECTUS_HOST'));
}

program
  .name('directus-power-tools')
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
  .addOption(
    new Option('-S, --snapshots [name...]', 'Choose which snapshots to apply')
      .choices(SNAPSHOT_NAMES)
      .default(SNAPSHOT_NAMES),
  )
  .action(apply);

export const run = async () => {
  try {
    await program.parseAsync(process.argv);
  } catch (e) {
    printError(e);
    process.exit(1);
  }
};
