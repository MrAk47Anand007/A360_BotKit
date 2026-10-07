import { readFile, access, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const manifest = JSON.parse(await read('manifest.json'));
assert.equal(manifest.manifest_version, 3);
assert.match(manifest.version, /^\d+(\.\d+){0,3}$/);
assert.ok(manifest.description.length <= 132, 'Manifest description exceeds 132 characters');
assert.equal(manifest.background.type, 'module');
const popup = await read(manifest.action.default_popup);
assert.ok(popup.includes(`v${manifest.version} |`), 'Popup version differs from manifest');
const npmVersion = JSON.parse(await read('package.json')).version;
assert.equal(npmVersion, `${manifest.version}.0`, 'Package metadata differs from release version');
const references = [manifest.background.service_worker, manifest.action.default_popup,
    ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
    ...manifest.content_scripts.flatMap(entry => entry.js),
    ...manifest.web_accessible_resources.flatMap(entry => entry.resources)];
for (const file of references) await access(resolve(root, file));
for (const match of popup.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.ok(!/^(?:https?:)?\/\//.test(match[1]), `Popup uses an external asset: ${match[1]}`);
    await access(resolve(root, dirname(manifest.action.default_popup), match[1]));
}
let scripts = 0;
for (const folder of ['background', 'content_scripts', 'popup']) {
    for (const name of await readdir(resolve(root, folder))) {
        if (!name.endsWith('.js')) continue;
        const file = join(folder, name);
        execFileSync(process.execPath, ['--check', resolve(root, file)], { stdio: 'pipe' });
        const source = await read(file);
        for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
            await access(resolve(root, folder, match[1]));
        }
        scripts++;
    }
}
console.log(`Release ${manifest.version}: manifest, runtime references, local popup assets, and ${scripts} JavaScript files validated.`);
