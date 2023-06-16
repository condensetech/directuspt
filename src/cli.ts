import { program } from 'commander';

function getPackageVersionSync() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { version } = require('../package.json');
  return version;
}

program
  .name('directus-power-tools')
  .description('Directus CLI Tool to help with snapshotting, seeding, and more.')
  .version(getPackageVersionSync());

export const run = async () => program.parseAsync(process.argv);
