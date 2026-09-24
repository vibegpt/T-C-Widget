import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { publicUrl } from './policy-input';

const blocked = new BlockList();
for (const [ip, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['198.18.0.0',15],['224.0.0.0',4],['240.0.0.0',4]] as const) blocked.addSubnet(ip,prefix,'ipv4');
for (const [ip, prefix] of [['::',128],['::1',128],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32]] as const) blocked.addSubnet(ip,prefix,'ipv6');
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  return family !== 0 && !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

/** Pin validated DNS to the connection; revalidate each redirect. */
async function readPage(value: string, signal: AbortSignal, redirects = 0): Promise<{html: string; url: string}> {
  const url = new URL(publicUrl(value));
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{address: host, family: isIP(host)}] : await lookup(host, {all: true});
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Non-public destination refused');
  if (signal.aborted) throw new Error('Policy fetch timed out');
  const pinned = addresses[0];
  return new Promise((resolve, reject) => {
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = request(url, {
      signal,
      // Passed through to net.connect; Node 20 HTTP typings omit this option.
      ...{autoSelectFamily: true},
      headers: {'User-Agent': 'PolicyCheck/1.0.3', Accept: 'text/html,text/plain'},
      lookup: (_hostname, options, callback) => {
        if (typeof options === 'object' && options.all) callback(null, addresses);
        else callback(null, pinned.address, pinned.family);
      },
    }, res => {
      if ([301,302,303,307,308].includes(res.statusCode ?? 0) && res.headers.location) {
        res.resume();
        if (redirects >= 4) return reject(new Error('Too many policy redirects'));
        readPage(new URL(res.headers.location, url).href, signal, redirects+1).then(resolve,reject);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
      if (!/text\/(html|plain)|application\/xhtml\+xml/i.test(res.headers['content-type'] || '')) { res.resume(); reject(new Error('Unsupported policy content type')); return; }
      const chunks: Buffer[] = []; let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > 1_000_000) { res.destroy(new Error('Policy page exceeds 1 MB')); return; }
        chunks.push(Buffer.from(chunk));
      });
      res.on('end', () => resolve({html: Buffer.concat(chunks).toString('utf8'), url: url.href}));
      res.on('error', reject);
    });
    req.on('error', reject); req.end();
  });
}
export function extractPolicyText(html: string): string {
  return html.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/\s+/g,' ').trim();
}
export async function fetchPolicyPage(url: string, signal = AbortSignal.timeout(10_000)) {
  const page = await readPage(url, signal);
  const text = extractPolicyText(page.html);
  if (text.length < 100 || /^(access denied|just a moment|verify you are human)/i.test(text)) throw new Error('No usable policy content');
  return {text, url: page.url, retrieved_at: new Date().toISOString(), content_hash: 'sha256:'+createHash('sha256').update(text).digest('hex')};
}
export async function fetchPolicyFromUrl(url: string): Promise<string> { return (await fetchPolicyPage(url)).text; }
