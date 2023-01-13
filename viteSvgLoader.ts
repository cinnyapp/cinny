import svgToMiniDataURI from 'mini-svg-data-uri';
import type { Plugin } from 'rollup';
import fs from 'fs';

// TODO: remove this once https://github.com/vitejs/vite/pull/2909 gets merged
export const svgLoader = (): Plugin => ({
  name: 'vite-svg-patch-plugin',
  transform: (code, id) => {
    if (id.endsWith('.svg')) {
      const extractedSvg = fs.readFileSync(id, 'utf8');
      const datauri = svgToMiniDataURI.toSrcset(extractedSvg);
      return `export default "${datauri}"`;
    }
    return code;
  },
});
