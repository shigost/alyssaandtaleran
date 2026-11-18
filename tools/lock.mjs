// Locks the wedding site behind a password.
//
// Usage (from the repo folder):  node tools/lock.mjs banana
//
// Reads site.html (the real site, kept only on your computer, never committed),
// encrypts it with the password, and writes index.html: a password screen that
// holds the encrypted site. Without the password, index.html can't be read,
// even on GitHub. Passwords ignore capital letters and extra spaces.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'site.html');
const OUT = join(root, 'index.html');
const ITER = 600000;

// same rule as the password screen: only letters and numbers count, capitals ignored
const pass = (process.argv[2] || '').toLowerCase().normalize('NFKC').replace(/[^a-z0-9]/g, '');
if (!pass) { console.error('Add the password: node tools/lock.mjs yourpassword'); process.exit(1); }
if (!existsSync(SRC)) { console.error('site.html is missing. Put the real site in site.html first.'); process.exit(1); }

const b64 = (u8) => Buffer.from(u8).toString('base64');
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, readFileSync(SRC)));

const gate = readFileSync(join(root, 'tools', 'gate.html'), 'utf8')
  .replace('__LOCK__', JSON.stringify({ salt: b64(salt), iv: b64(iv), iter: ITER, data: b64(data) }));
writeFileSync(OUT, gate);
console.log(`Locked: index.html (${Math.round(gate.length / 1024)} KB). Commit and push it; never commit site.html.`);
