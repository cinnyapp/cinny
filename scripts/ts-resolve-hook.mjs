/**
 * Lets `node --experimental-strip-types` resolve the extension-less relative
 * imports that TypeScript/Vite sources use (`./foo` -> `./foo.ts`).
 * Used by the test scripts via `--import ./scripts/ts-resolve-hook.mjs`.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./ts-resolve-hook-impl.mjs', pathToFileURL(`${import.meta.dirname}/`));
