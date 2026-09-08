import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
await build({stdin:{contents:"export * from './backend/src/index.ts'; export * from './shared/finance.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/finance-test.mjs'});
const run=spawnSync(process.execPath,['--test','tests/finance.test.mjs'],{stdio:'inherit'});process.exit(run.status??1);
