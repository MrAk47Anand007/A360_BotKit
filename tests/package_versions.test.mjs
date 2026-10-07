import test from 'node:test';
import assert from 'node:assert/strict';

const api = await import('../background/package_versions.js').catch(() => ({}));
const origin = 'https://control.example';
const bot = {
    triggers: [{ custom: true }],
    nodes: [{ uid: 'one', packageName: 'Recorder', commandName: 'capture', attributes: [{ name: 'wait', value: { number: '15' } }] }],
    variables: [{ name: 'input', type: 'STRING' }],
    packages: [{ name: 'Recorder', version: 'old', settingsAttributes: [{ name: 'custom', value: 'keep' }] }, { name: 'MessageBox', version: '3.8.1' }],
    properties: { botCodeVersion: '7', custom: 'keep' },
    extraField: { keep: true },
};

function mockFetch(t, handler) {
    t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
        const result = await handler(new URL(url), options);
        return new Response(JSON.stringify(result.body ?? result), { status: result.status ?? 200 });
    });
}

test('changes only the matching version without mutating the source JSON', () => {
    assert.equal(typeof api.changePackageVersion, 'function');
    const before = structuredClone(bot);
    const result = api.changePackageVersion(bot, 'Recorder', 'new');
    const expected = structuredClone(before);
    expected.packages[0].version = 'new';
    assert.deepEqual(result.content, expected);
    assert.equal(result.status, 'updated');
    assert.deepEqual(bot, before);
});

test('never adds absent packages and recognizes versions already selected', () => {
    assert.equal(typeof api.changePackageVersion, 'function');
    assert.equal(api.changePackageVersion(bot, 'Browser', 'new').status, 'skipped');
    assert.equal(api.changePackageVersion(bot, 'Recorder', 'old').status, 'unchanged');
    assert.throws(() => api.changePackageVersion({ packages: 'bad' }, 'Recorder', 'new'));
    assert.throws(() => api.changePackageVersion({ packages: [bot.packages[0], bot.packages[0]] }, 'Recorder', 'new'));
});

test('paginates published versions using totalFilter and excludes disabled versions', async t => {
    assert.equal(typeof api.getPackageVersions, 'function');
    const offsets = [];
    mockFetch(t, (url, options) => {
        assert.equal(url.pathname, '/v2/packages/package/version/list');
        const body = JSON.parse(options.body);
        assert.deepEqual(body.filter, { operator: 'eq', value: 'Recorder', field: 'name' });
        offsets.push(body.page.offset);
        return { page: { total: 999, totalFilter: 3 }, list: body.page.offset === 0
            ? [{ name: 'Recorder', packageVersion: 'new', status: 'DEFAULT' }, { name: 'Recorder', packageVersion: 'bad', status: 'DISABLED' }]
            : [{ name: 'Recorder', packageVersion: 'old', status: 'ENABLED' }] };
    });
    const versions = await api.getPackageVersions(origin, 'Recorder', 'token');
    assert.deepEqual(offsets, [0, 2]);
    assert.deepEqual(versions.map(v => v.packageVersion), ['new', 'old']);
});

test('scans nested task bots, avoids duplicate folders, and exposes unreadable bots', async t => {
    assert.equal(typeof api.scanFolderPackages, 'function');
    mockFetch(t, (url, options) => {
        const path = url.pathname;
        if (path === '/v2/repository/folders/root') return { id: 'root', name: 'Samples' };
        if (path.endsWith('/root/list')) return { list: [
            { id: 'a', name: 'Bot A', type: 'application/vnd.aa.taskbot', permission: { editContent: true } },
            { id: 'child', name: 'Nested', type: 'application/vnd.aa.directory' },
            { id: 'form', name: 'Form', type: 'application/vnd.aa.form' },
        ] };
        if (path.endsWith('/child/list')) return { list: [
            { id: 'b', name: 'Bot B', type: 'application/vnd.aa.taskbot' },
            { id: 'broken', name: 'Unreadable', type: 'application/vnd.aa.taskbot' },
            { id: 'root', name: 'Samples', type: 'application/vnd.aa.directory' },
        ] };
        if (path.endsWith('/a/content')) return bot;
        if (path.endsWith('/b/content')) return { ...bot, packages: [{ name: 'MessageBox', version: '3.8.1' }] };
        if (path.endsWith('/broken/content')) return { status: 403, body: { message: 'Denied' } };
        throw new Error(`Unexpected request ${path} ${options.method}`);
    });
    const result = await api.scanFolderPackages(origin, 'root', 'token');
    assert.equal(result.foldersVisited, 2);
    assert.deepEqual(result.bots.map(b => b.id), ['a', 'b', 'broken']);
    assert.equal(result.bots[1].path, 'Samples/Nested/Bot B');
    assert.match(result.bots[2].error, /Denied/);
    assert.deepEqual(result.bots[0].packages, bot.packages);
});

test('uses fresh bot content, preserves hasErrors and never rewrites dependencies', async t => {
    assert.equal(typeof api.updateBotPackageVersion, 'function');
    let written;
    const fresh = { ...structuredClone(bot), extraField: { newEdit: 'preserve me' } };
    mockFetch(t, (url, options) => {
        if (/\/files\/a$/.test(url.pathname)) return { type: 'application/vnd.aa.taskbot', hasErrors: true, permission: { editContent: true }, contentModifiedTimestamp: '1' };
        if (options.method === 'PUT') {
            assert.equal(url.searchParams.get('hasErrors'), 'true');
            written = JSON.parse(options.body);
            return {};
        }
        if (url.pathname.endsWith('/a/content')) return written || fresh;
        throw new Error('Dependencies or unrelated endpoint must not be written');
    });
    const result = await api.updateBotPackageVersion(origin, { id: 'a', expectedVersion: 'old' }, 'Recorder', 'new', 'token');
    assert.equal(result.status, 'updated');
    const expected = structuredClone(fresh);
    expected.packages[0].version = 'new';
    assert.deepEqual(written, expected);
});

test('skips a bot changed since the preview, locked bots, and denied edits', async t => {
    assert.equal(typeof api.updateBotPackageVersion, 'function');
    for (const condition of ['version', 'locked', 'permission', 'edited', 'timestamp']) {
        let metadataReads = 0;
        mockFetch(t, (url, options) => {
            assert.notEqual(options.method, 'PUT', condition);
            if (/\/files\/a$/.test(url.pathname)) {
                metadataReads++;
                return { type: 'application/vnd.aa.taskbot', hasErrors: false,
                    locked: condition === 'locked', isEdited: condition === 'edited',
                    permission: { editContent: condition !== 'permission' },
                    contentModifiedTimestamp: condition === 'timestamp' ? String(metadataReads) : '1' };
            }
            return condition === 'version' ? { ...bot, packages: [{ name: 'Recorder', version: 'someone-else' }] } : bot;
        });
        const result = await api.updateBotPackageVersion(origin, { id: 'a', expectedVersion: 'old' }, 'Recorder', 'new', 'token');
        assert.equal(result.status, 'skipped', condition);
        t.mock.restoreAll();
    }
});

test('skips writes when the content change timestamp is missing', async t => {
    let writes = 0;
    mockFetch(t, (url, options) => {
        if (options.method === 'PUT') writes++;
        if (/\/files\/a$/.test(url.pathname)) return { type: 'application/vnd.aa.taskbot', hasErrors: false, permission: { editContent: true } };
        return bot;
    });
    const result = await api.updateBotPackageVersion(origin, { id: 'a', expectedVersion: 'old' }, 'Recorder', 'new', 'token');
    assert.equal(result.status, 'skipped');
    assert.match(result.detail, /timestamp/i);
    assert.equal(writes, 0);
});

test('reports rejected writes', async t => {
    assert.equal(typeof api.updateBotPackageVersion, 'function');
    mockFetch(t, (url, options) => {
        if (/\/files\/a$/.test(url.pathname)) return { type: 'application/vnd.aa.taskbot', hasErrors: false, permission: { editContent: true }, contentModifiedTimestamp: '1' };
        if (options.method === 'PUT') return { status: 403, body: { message: 'Write denied' } };
        return bot;
    });
    const result = await api.updateBotPackageVersion(origin, { id: 'a', expectedVersion: 'old' }, 'Recorder', 'new', 'token');
    assert.equal(result.status, 'failed');
    assert.match(result.error, /Write denied/);
});

test('does not claim success when accepted writes cannot be verified', async t => {
    assert.equal(typeof api.updateBotPackageVersion, 'function');
    mockFetch(t, (url, options) => {
        if (/\/files\/a$/.test(url.pathname)) return { type: 'application/vnd.aa.taskbot', hasErrors: false, permission: { editContent: true }, contentModifiedTimestamp: '1' };
        if (options.method === 'PUT') return {};
        return bot; // Server accepted the save but still returns the old content.
    });
    const result = await api.updateBotPackageVersion(origin, { id: 'a', expectedVersion: 'old' }, 'Recorder', 'new', 'token');
    assert.equal(result.status, 'unverified');
});

test('a network failure during PUT is uncertain, not a confirmed rejection', async t => {
    assert.equal(typeof api.updateBotPackageVersion, 'function');
    mockFetch(t, (url, options) => {
        if (/\/files\/a$/.test(url.pathname)) return { type: 'application/vnd.aa.taskbot', hasErrors: false, permission: { editContent: true }, contentModifiedTimestamp: '1' };
        if (options.method === 'PUT') throw new Error('Connection lost after upload');
        return bot;
    });
    const result = await api.updateBotPackageVersion(origin, { id: 'a', expectedVersion: 'old' }, 'Recorder', 'new', 'token');
    assert.equal(result.status, 'unverified');
});
