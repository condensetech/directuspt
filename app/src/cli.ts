import { program } from 'commander';
import { printError } from './errors';
import { addCommands } from '@directuspt/lib';

function getPackageVersionSync() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { version } = require('../package.json');
  return version;
}

program
  .name('directuspt')
  .description('Directus CLI Tool to help with snapshotting, seeding, and more.')
  .version(getPackageVersionSync());

addCommands(program);

export const run = async () => {
  try {
    await program.parseAsync(process.argv);
  } catch (e) {
    printError(e);
    process.exit(1);
  }
};
