import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

await build({
  stdin: {
    contents: `
      export {default as OverviewPage} from './frontend/pages/OverviewPage';
      export {default as TransactionsPage} from './frontend/pages/TransactionsPage';
      export {filterTransactions} from './frontend/finance/transactions';
      export {createEditor} from './frontend/finance/editor';
      export {createUiSession} from './frontend/finance/ui-session';
      export {demoState} from './frontend/demo';
      export {EMPTY} from './shared/finance';
    `,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  loader: { '.css': 'empty' },
  outfile: '.sites-runtime/frontend-test.mjs',
});
const run = spawnSync(process.execPath, ['--test', 'tests/frontend.test.mjs'], { stdio: 'inherit' });
process.exit(run.status ?? 1);
