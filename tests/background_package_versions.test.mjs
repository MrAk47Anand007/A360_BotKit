import test from 'node:test';
import assert from 'node:assert/strict';

test('background batches survive popup detachment, reject overlaps, and report worker interruption', async t => {
    const store = {};
    let listener;
    let completed;
    const finished = new Promise(resolve => { completed = resolve; });
    const oldChrome = globalThis.chrome;
    globalThis.chrome = {
        storage: { session: {
            get: async key => ({ [key]: structuredClone(store[key]) }),
            set: async data => {
                Object.assign(store, structuredClone(data));
                const job = data['botkit-package-version-job'];
                if (job?.state === 'complete') completed(job);
            },
        } },
        runtime: { onMessage: { addListener: handler => { listener = handler; } } },
    };
    t.after(() => { if (oldChrome === undefined) delete globalThis.chrome; else globalThis.chrome = oldChrome; });
    let releaseVersions;
    const versionGate = new Promise(resolve => { releaseVersions = resolve; });
    let saved = false;
    t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
        let body;
        if (url.includes('/package/version/list')) {
            await versionGate;
            body = { page: { totalFilter: 1 }, list: [{ name: 'Recorder', packageVersion: 'new', status: 'ENABLED' }] };
        } else if (/\/files\/1$/.test(url)) body = { type: 'application/vnd.aa.taskbot', hasErrors: false, permission: { editContent: true }, contentModifiedTimestamp: '1' };
        else {
            if (options.method === 'PUT') saved = true;
            body = { packages: [{ name: 'Recorder', version: saved ? 'new' : 'old' }] };
        }
        return new Response(JSON.stringify(body));
    });
    await import('../background/background.js?worker=first');
    const send = request => new Promise(resolve => { assert.equal(listener(request, {}, resolve), true); });
    const request = { action: 'startPackageVersionUpdate', origin: 'https://control.example', folderID: '100',
        authToken: 'secret', packageName: 'Recorder', version: 'new', bots: [{ id: '1', name: 'Bot A', expectedVersion: 'old' }] };
    const started = await send(request);
    assert.equal(started.success, true);
    assert.equal((await send({ action: 'getPackageVersionJob' })).job.state, 'running');
    const overlap = await send(request);
    assert.equal(overlap.success, false);
    assert.match(overlap.error, /already running/);
    // No popup response or continuing connection is required to finish.
    releaseVersions();
    const result = await finished;
    assert.equal(result.results[0].status, 'updated');
    assert.ok(!JSON.stringify(store).includes('secret'));
    store['botkit-package-version-job'].state = 'running';
    await import('../background/background.js?worker=restarted');
    const recovered = await send({ action: 'getPackageVersionJob' });
    assert.equal(recovered.job.state, 'interrupted');
    assert.match(recovered.job.error, /Scan again/);
});

test('storage failures after a save preserve confirmed bot results', async t => {
    const oldChrome = globalThis.chrome;
    let listener;
    let finished;
    const report = new Promise(resolve => { finished = resolve; });
    let failures = 0;
    globalThis.chrome = {
        storage: { session: { get: async () => ({}), set: async data => {
            const job = data['botkit-package-version-job'];
            if (job.completed === 1 && failures++ < 2) throw new Error('Storage unavailable');
            if (job.state === 'failed') finished(job);
        } } },
        runtime: { onMessage: { addListener: handler => { listener = handler; } } },
    };
    t.after(() => { globalThis.chrome = oldChrome; });
    let saved = false;
    t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
        let body;
        if (url.includes('/package/version/list')) body = { page: { totalFilter: 1 }, list: [{ name: 'Recorder', packageVersion: 'new', status: 'ENABLED' }] };
        else if (/\/files\/1$/.test(url)) body = { type: 'application/vnd.aa.taskbot', hasErrors: false, permission: { editContent: true }, contentModifiedTimestamp: '1' };
        else {
            if (options.method === 'PUT') saved = true;
            body = { packages: [{ name: 'Recorder', version: saved ? 'new' : 'old' }] };
        }
        return new Response(JSON.stringify(body));
    });
    await import('../background/background.js?worker=storage-failure');
    await new Promise(resolve => listener({ action: 'startPackageVersionUpdate', origin: 'https://control.example', folderID: '100',
        authToken: 'secret', packageName: 'Recorder', version: 'new', bots: [{ id: '1', name: 'Bot A', expectedVersion: 'old' }] }, {}, resolve));
    const final = await report;
    assert.equal(final.completed, 1);
    assert.equal(final.results[0].status, 'updated');
    assert.match(final.error, /Storage unavailable/);
});
