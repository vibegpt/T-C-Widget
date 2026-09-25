import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url);
registerHooks({resolve(spec,context,next) {
  if (spec.startsWith('@/')) spec=new URL('src/'+spec.slice(2),root).href;
  if (spec.startsWith('.') || spec.startsWith('file:')) {
    const url=new URL(spec,context.parentURL);
    if (!/\.(ts|js|mjs|json)$/.test(url.pathname) && existsSync(fileURLToPath(url)+'.ts')) return next(url.href+'.ts',context);
  }
  return next(spec,context);
}});
