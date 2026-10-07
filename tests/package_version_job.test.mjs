import test from 'node:test';
import assert from 'node:assert/strict';

const jobAPI = await import('../background/package_version_job.js').catch(() => ({}));

test('rejects an unavailable version before writing any bot', async t => {
    assert.equal(typeof jobAPI.runPackageVersionJob, 'function');
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.ok(url.includes('/package/version/list'));
        assert.equal(options.method, 'POST');
        return new Response(JSON.stringify({ list: [], page: { totalFilter: 0 } }));
    });
    const reports = [];
    await jobAPI.runPackageVersionJob({ origin: 'https://control.example', packageName: 'Recorder', version: 'bad', bots: [{ id: '1' }] }, 'token', job => reports.push(structuredClone(job)));
    assert.equal(reports.at(-1).state, 'failed');
    assert.match(reports.at(-1).error, /available/);
});

test('continues after individual errors and checkpoints every result without storing auth', async t => {
    assert.equal(typeof jobAPI.runPackageVersionJob, 'function');
    let saved = false;
    t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
        let body;
        if (url.includes('/package/version/list')) body = { list: [{ name: 'Recorder', packageVersion: 'new', status: 'ENABLED' }], page: { totalFilter: 1 } };
        else if (/\/files\/1$/.test(url)) return new Response('{"message":"Denied"}', { status: 403 });
        else if (/\/files\/2$/.test(url)) body = { type: 'application/vnd.aa.taskbot', hasErrors: false, permission: { editContent: true }, contentModifiedTimestamp: '1' };
        else if (url.includes('/files/2/content')) {
            if (options.method === 'PUT') saved = true;
            body = { packages: [{ name: 'Recorder', version: saved ? 'new' : 'old' }], nodes: [{ keep: true }] };
        } else throw new Error(url);
        return new Response(JSON.stringify(body));
    });
    const reports = [];
    await jobAPI.runPackageVersionJob({ id: 'job', origin: 'https://control.example', packageName: 'Recorder', version: 'new', bots: [{ id: '1', name: 'Fails', expectedVersion: 'old' }, { id: '2', name: 'Succeeds', expectedVersion: 'old' }] }, 'secret-token', job => reports.push(structuredClone(job)));
    const final = reports.at(-1);
    assert.equal(final.state, 'complete');
    assert.deepEqual(final.results.map(r => r.status), ['failed', 'updated']);
    assert.equal(final.completed, 2);
    assert.ok(reports.some(r => r.completed === 1));
    assert.ok(!JSON.stringify(reports).includes('secret-token'));
});
