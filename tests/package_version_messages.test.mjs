import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(await readFile(new URL('../popup/package_versions.js', import.meta.url), 'utf8'), context);

test('outdated background workers show a reload instruction instead of Unknown action', async () => {
    assert.equal(typeof context.sendPackageVersionRequest, 'function');
    await assert.rejects(context.sendPackageVersionRequest(async () => ({ success: false, error: 'Unknown action' }), 'scanFolderPackages'),
        /Reload A360 BotKit.*extensions.*refresh.*Control Room/i);
});

test('package requests preserve API errors and successful responses', async () => {
    assert.equal(typeof context.sendPackageVersionRequest, 'function');
    await assert.rejects(context.sendPackageVersionRequest(async () => ({ success: false, error: 'Access denied' }), 'scanFolderPackages'), /Access denied/);
    const response = { success: true, scan: { bots: [] } };
    assert.equal(await context.sendPackageVersionRequest(async () => response, 'scanFolderPackages'), response);
});
