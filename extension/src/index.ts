import { defineHook } from '@directus/extensions-sdk';
import { addCommands } from '@directuspt/lib';
import type { Command } from 'commander';

export default defineHook(({ init }) => {
  init('cli.after', (meta) => {
    const program: Command = meta.program;
    const command = program.command('pt').description('Import/Export GitOps-style PowerTools');
    addCommands(command);
  });
});
