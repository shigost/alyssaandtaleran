// Gets the real site back out of the locked index.html.
//
// Usage (from the repo folder):  node tools/unlock.mjs banana
//
// Writes site.html (ignored by git, never committed) so it can be edited,
// then run tools/lock.mjs with the password to lock it again.

import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// same rule as the password screen: only letters and numbers count, capitals ignored
const pass = (process.argv[2] || '').toLowerCase().normalize('NFKC').replace(/[^a-z0-9]/g, '');
if (!pass) { console.error('Add the password: node tools/unlock.mjs yourpassword'); process.exit(1); }

const html = readFileSync(join(root, 'index.html'), 'utf8');
const m = html.match(/var LOCK = (\{.*?\});/s);
if (!m) { console.error('index.html is not locked.'); process.exit(1); }
const LOCK = JSON.parse(m[1]);
const un64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: un64(LOCK.salt), iterations: LOCK.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
let buf;
try { buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: un64(LOCK.iv) }, key, un64(LOCK.data)); }
catch { console.error('Wrong password.'); process.exit(1); }
writeFileSync(join(root, 'site.html'), Buffer.from(buf));
console.log('Unlocked: site.html is ready to edit. Lock it again with tools/lock.mjs when done.');
