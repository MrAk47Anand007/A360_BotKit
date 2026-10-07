// Browser-only fixture. It exercises the real popup and background worker on fake bots.
const origin = 'https://fixture.control.example';
const context = { origin, pageType: 'folder', folderID: '100', authToken: 'fixture-token',
    url: `${origin}/#/bots/repository/private/folders/100` };
const contents = {
    '101': { nodes: [{ packageName: 'Recorder', keep: true }], variables: [{ name: 'Keep' }], packages: [{ name: 'Recorder', version: '5.10.1' }, { name: 'MessageBox', version: '3.8.1' }], properties: { untouched: true } },
    '102': { nodes: [], packages: [{ name: 'MessageBox', version: '3.8.1' }], custom: 'keep' },
    '103': { nodes: [], packages: [{ name: 'Recorder', version: '5.9.2' }], custom: 'nested' },
};
const writes = [];
const originals = structuredClone(contents);
const checks = document.createElement('pre');
checks.id = 'fixtureChecks';
checks.hidden = true;
document.body.append(checks);
function updateChecks() {
    checks.textContent = JSON.stringify({
        writtenBotIds: writes.map(write => write.id),
        absentPackageBotUntouched: JSON.stringify(contents['102']) === JSON.stringify(originals['102']),
        unrelatedContentPreserved: ['101', '103'].every(id => {
            const expected = structuredClone(originals[id]);
            expected.packages.find(pkg => pkg.name === 'Recorder').version = contents[id].packages.find(pkg => pkg.name === 'Recorder').version;
            return JSON.stringify(expected) === JSON.stringify(contents[id]);
        }),
    });
}
updateChecks();
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, options = {}) => {
    if (!String(input).startsWith(origin)) return nativeFetch(input, options);
    const url = new URL(input);
    let body;
    if (url.pathname.endsWith('/package/version/list')) body = { page: { totalFilter: 3 }, list: [
        { name: 'Recorder', packageVersion: '5.11.0', status: 'DEFAULT', recommendedBotAgentVersion: '21.210', recommendedControlRoomVersion: '14068' },
        { name: 'Recorder', packageVersion: '5.10.1', status: 'ENABLED' },
        { name: 'Recorder', packageVersion: '5.9.2', status: 'ENABLED' },
    ] };
    else if (url.pathname.endsWith('/folders/100')) body = { id: '100', name: 'Sample bots' };
    else if (url.pathname.endsWith('/folders/100/list')) body = { list: [
        { id: '101', name: 'Bot A', type: 'application/vnd.aa.taskbot', permission: { editContent: true } },
        { id: '102', name: 'Bot B', type: 'application/vnd.aa.taskbot', permission: { editContent: true } },
        { id: '200', name: 'Nested', type: 'application/vnd.aa.directory' },
    ] };
    else if (url.pathname.endsWith('/folders/200/list')) body = { list: [{ id: '103', name: 'Bot C', type: 'application/vnd.aa.taskbot', permission: { editContent: true } }] };
    else if (url.pathname.endsWith('/children')) body = url.pathname.includes('/100/') ? [{ id: '200', name: 'Nested', type: 'application/vnd.aa.directory' }] : [];
    else if (/\/files\/\d+\/content$/.test(url.pathname)) {
        const id = url.pathname.split('/').at(-2);
        if (options.method === 'PUT') { contents[id] = JSON.parse(options.body); writes.push({ id, content: structuredClone(contents[id]) }); updateChecks(); }
        body = contents[id];
    } else if (/\/files\/\d+$/.test(url.pathname)) body = { type: 'application/vnd.aa.taskbot', hasErrors: false, permission: { editContent: true }, contentModifiedTimestamp: '1' };
    else throw new Error(`Unexpected fixture request: ${url.pathname}`);
    return new Response(JSON.stringify(body));
};
const listeners = [];
const storageData = {};
function storageArea() {
    return {
        get: (key, callback) => { const result = { [key]: storageData[key] }; if (callback) callback(result); return Promise.resolve(result); },
        set: (data, callback) => { Object.assign(storageData, structuredClone(data)); callback?.(); return Promise.resolve(); },
    };
}
window.chrome = {
    runtime: { onMessage: { addListener: listener => listeners.push(listener) },
        sendMessage: (message, callback) => listeners[0](message, {}, callback) },
    storage: { local: storageArea(), session: storageArea() },
    tabs: { query: (_, callback) => callback([{ id: 1, url: context.url }]),
        sendMessage: (_, message, callback) => callback(message.action === 'getTabDetails' ? context : { success: true, settings: { enabled: false }, status: 'inactive' }) },
};
await import('../background/background.js');
for (const src of ['/popup/package_versions.js', '/popup/popup.js']) {
    // The first script does not exist until the feature is implemented.
    if (!(await nativeFetch(src)).ok) continue;
    await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.body.append(script); });
}
document.dispatchEvent(new Event('DOMContentLoaded'));
window.fixtureResults = { contents, writes };
document.body.dataset.fixtureReady = 'true';
