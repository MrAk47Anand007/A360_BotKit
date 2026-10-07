async function sendPackageVersionRequest(runtimeSendMessage, action, extra = {}) {
    const response = await runtimeSendMessage({ action, ...extra });
    if (!response?.success) {
        if (response?.error === 'Unknown action') {
            throw new Error('Reload A360 BotKit on your browser extensions page, then refresh the Control Room tab and reopen BotKit. The background worker has not loaded Version Update yet.');
        }
        throw new Error(response?.error || 'Control Room request failed');
    }
    return response;
}

function initPackageVersionTab({ getTabDetails, runtimeSendMessage }) {
    const ids = ['Folder', 'Scan', 'Status', 'Selection', 'BotCount', 'BotSearch', 'SelectAll', 'BotList',
        'Package', 'Usage', 'Target', 'Requirements', 'PreviewButton', 'Preview', 'PreviewSummary', 'PreviewList',
        'Apply', 'Job', 'JobCount', 'JobSummary', 'JobProgress', 'JobList', 'DownloadReport'];
    const ui = Object.fromEntries(ids.map(id => [id, document.getElementById(`version${id}`)]));
    const state = { scan: null, context: null, selected: new Set(), versions: [], busy: false,
        job: null, poll: null, preview: null, loadingVersion: 0, scanJobId: null };
    const statusNames = { updated: 'Updated', unchanged: 'Already at version', skipped: 'Skipped',
        failed: 'Failed', unverified: 'Needs verification' };

    function status(text, error = false) {
        ui.Status.textContent = text;
        ui.Status.classList.toggle('version-error', error);
    }
    function node(tag, text, className) {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        return element;
    }
    function invalidatePreview() {
        state.preview = null;
        ui.Preview.hidden = true;
        ui.Apply.disabled = true;
    }
    function syncControls() {
        const busy = state.busy || state.job?.state === 'running';
        ui.Scan.disabled = busy;
        ui.SelectAll.disabled = busy;
        ui.BotSearch.disabled = busy;
        ui.Package.disabled = busy || !ui.Package.value;
        // Empty package selection must remain selectable when options exist.
        if (!busy && ui.Package.options.length > 1) ui.Package.disabled = false;
        ui.Target.disabled = busy || !state.versions.length;
        ui.PreviewButton.disabled = busy || !ui.Package.value || !ui.Target.value;
        ui.Apply.disabled = busy || !state.preview?.changing.length;
        ui.BotList.querySelectorAll('input[type="checkbox"]').forEach(input => {
            const bot = state.scan?.bots.find(bot => bot.id === input.value);
            input.disabled = busy || !bot?.editable || Boolean(bot?.error);
        });
    }
    async function request(action, extra = {}) {
        return sendPackageVersionRequest(runtimeSendMessage, action, extra);
    }
    async function folderContext(requireScan = false) {
        const context = await getTabDetails();
        if (context?.pageType !== 'folder' || !context.folderID || !context.authToken) {
            throw new Error('Open an authenticated Control Room folder, then scan it.');
        }
        if (requireScan && (context.origin !== state.context?.origin || String(context.folderID) !== String(state.context?.folderID))) {
            throw new Error('The active folder changed. Scan the current folder before updating.');
        }
        return context;
    }
    function selectedBots() { return state.scan?.bots.filter(bot => state.selected.has(bot.id)) || []; }

    function renderBots() {
        ui.BotList.replaceChildren();
        const search = ui.BotSearch.value.trim().toLowerCase();
        const bots = state.scan?.bots || [];
        const visible = bots.filter(bot => `${bot.name} ${bot.path}`.toLowerCase().includes(search));
        for (const bot of visible) {
            const row = node('label', undefined, 'version-bot-row');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = bot.id;
            input.checked = state.selected.has(bot.id);
            input.setAttribute('aria-label', `Select ${bot.name}`);
            const detail = node('span', undefined, 'version-row-detail');
            detail.append(node('strong', bot.name), node('span', bot.path, 'version-muted'));
            if (bot.error) detail.append(node('span', bot.error, 'version-error'));
            else detail.append(node('span', `${bot.packages.length} packages`, 'version-muted'));
            input.addEventListener('change', () => {
                if (input.checked) state.selected.add(bot.id); else state.selected.delete(bot.id);
                renderPackages();
                renderBots();
            });
            row.append(input, detail);
            ui.BotList.append(row);
        }
        if (!visible.length) ui.BotList.append(node('p', bots.length ? 'No bots match this search.' : 'No Task Bots found.', 'version-muted'));
        const editable = bots.filter(bot => bot.editable && !bot.error);
        ui.SelectAll.checked = editable.length > 0 && editable.every(bot => state.selected.has(bot.id));
        ui.SelectAll.indeterminate = state.selected.size > 0 && !ui.SelectAll.checked;
        ui.BotCount.textContent = `${state.selected.size} / ${bots.length} selected`;
        syncControls();
    }

    function renderPackages() {
        const previous = ui.Package.value;
        const packages = new Map();
        for (const bot of selectedBots()) {
            for (const name of new Set(bot.packages.map(pkg => pkg?.name).filter(Boolean))) {
                packages.set(name, (packages.get(name) || 0) + 1);
            }
        }
        ui.Package.replaceChildren(new Option(packages.size ? 'Choose a package' : 'Select bots first', ''));
        for (const [name, count] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
            ui.Package.add(new Option(`${name} · ${count} selected bot${count === 1 ? '' : 's'}`, name));
        }
        if (packages.has(previous)) ui.Package.value = previous;
        invalidatePreview();
        renderUsage();
        if (!ui.Package.value) clearVersions();
        syncControls();
    }
    function clearVersions() {
        state.versions = [];
        state.loadingVersion++;
        ui.Target.replaceChildren(new Option('Select a package first', ''));
        ui.Requirements.textContent = '';
    }
    function renderUsage() {
        ui.Usage.replaceChildren();
        const name = ui.Package.value;
        if (!name) return;
        const all = state.scan.bots.filter(bot => bot.packages.some(pkg => pkg?.name === name));
        const selected = all.filter(bot => state.selected.has(bot.id));
        ui.Usage.append(node('p', `Used by ${selected.length} selected / ${all.length} scanned bots`, 'version-muted'));
        for (const bot of all) {
            const version = bot.packages.find(pkg => pkg?.name === name).version;
            ui.Usage.append(node('div', `${state.selected.has(bot.id) ? '✓ ' : ''}${bot.name} · ${version}`, 'version-usage-row'));
        }
    }
    function renderRequirements() {
        const target = state.versions.find(pkg => pkg.packageVersion === ui.Target.value);
        ui.Requirements.textContent = target
            ? `Recommended: Bot Agent ${target.recommendedBotAgentVersion || 'not specified'}; Control Room ${target.recommendedControlRoomVersion || 'not specified'}.`
            : '';
    }

    async function scan() {
        state.busy = true;
        syncControls();
        invalidatePreview();
        status('Scanning Task Bots and their packages, including subfolders…');
        try {
            const context = await folderContext();
            const response = await request('scanFolderPackages', context);
            state.scan = response.scan;
            state.scanJobId = null;
            state.context = { origin: context.origin, folderID: context.folderID };
            state.selected.clear();
            ui.BotSearch.value = '';
            clearVersions();
            ui.Package.replaceChildren(new Option('Select bots first', ''));
            ui.Usage.replaceChildren();
            ui.Selection.hidden = false;
            ui.Folder.textContent = `${state.scan.folder.name} · ${state.scan.foldersVisited} folders scanned`;
            const failures = state.scan.failures || [];
            const unreadable = state.scan.bots.filter(bot => bot.error).length;
            status(`${state.scan.bots.length} Task Bots found.${unreadable ? ` ${unreadable} unavailable.` : ''}${failures.length ? ` ${failures.length} folders could not be read: ${failures.map(f => `${f.path}: ${f.error}`).join('; ')}` : ''}`, failures.length > 0);
            renderBots();
        } catch (error) { status(error.message, true); }
        finally { state.busy = false; syncControls(); }
    }
    async function loadVersions() {
        invalidatePreview();
        clearVersions();
        renderUsage();
        const packageName = ui.Package.value;
        if (!packageName) { syncControls(); return; }
        const sequence = ++state.loadingVersion;
        state.busy = true;
        syncControls();
        status(`Loading published versions of ${packageName}…`);
        try {
            const context = await folderContext(true);
            const response = await request('getPackageVersions', { ...context, packageName });
            if (sequence !== state.loadingVersion) return;
            state.versions = response.versions;
            ui.Target.replaceChildren(new Option('Choose target version', ''));
            for (const pkg of state.versions) ui.Target.add(new Option(`${pkg.packageVersion}${pkg.status === 'DEFAULT' ? ' · Default' : ''}`, pkg.packageVersion));
            status(state.versions.length ? `${state.versions.length} enabled versions available.` : 'No enabled versions are available for this package.', !state.versions.length);
        } catch (error) { status(error.message, true); }
        finally { state.busy = false; syncControls(); }
    }

    async function preview() {
        try {
            await folderContext(true);
            const packageName = ui.Package.value;
            const version = ui.Target.value;
            if (!version || !state.versions.some(pkg => pkg.packageVersion === version)) throw new Error('Select a published target version.');
            const rows = selectedBots().map(bot => {
                const pkg = bot.packages.find(pkg => pkg?.name === packageName);
                return { ...bot, expectedVersion: pkg?.version, detail: !pkg ? 'Package not used · unchanged'
                    : pkg.version === version ? `${pkg.version} · already at version` : `${pkg.version} → ${version}` };
            });
            const matching = rows.filter(bot => typeof bot.expectedVersion === 'string');
            const changing = matching.filter(bot => bot.expectedVersion !== version);
            state.preview = { packageName, version, matching, changing };
            ui.PreviewSummary.textContent = `${changing.length} bots will change. ${matching.length - changing.length} already at version. ${rows.length - matching.length} do not use ${packageName}.`;
            ui.PreviewList.replaceChildren();
            for (const bot of rows) {
                const row = node('div', undefined, 'version-result-row');
                row.append(node('strong', bot.name), node('span', bot.detail, 'version-muted'));
                ui.PreviewList.append(row);
            }
            ui.Preview.hidden = false;
            syncControls();
        } catch (error) { status(error.message, true); }
    }
    async function apply() {
        if (!state.preview?.changing.length || state.busy || state.job?.state === 'running') return;
        const preview = state.preview;
        state.busy = true;
        syncControls();
        try {
            const context = await folderContext(true);
            const response = await request('startPackageVersionUpdate', { ...context, folderName: state.scan.folder.name,
                packageName: preview.packageName, version: preview.version,
                bots: preview.matching.map(bot => ({ id: bot.id, name: bot.name, path: bot.path, expectedVersion: bot.expectedVersion })) });
            state.job = response.job;
            state.scanJobId = response.job.id;
            invalidatePreview();
            renderJob();
            startPolling();
        } catch (error) { status(error.message, true); }
        finally { state.busy = false; syncControls(); }
    }
    function renderJob() {
        const job = state.job;
        ui.Job.hidden = !job;
        if (!job) return;
        ui.JobCount.textContent = `${job.completed} / ${job.total}`;
        ui.JobProgress.max = job.total || 1;
        ui.JobProgress.value = job.completed;
        const counts = {};
        for (const result of job.results) counts[result.status] = (counts[result.status] || 0) + 1;
        ui.JobSummary.textContent = job.state === 'running'
            ? `Updating ${job.packageName} to ${job.version}${job.currentBot ? ` · ${job.currentBot}` : ''}…`
            : `${job.packageName} → ${job.version}. ${Object.entries(counts).map(([key, value]) => `${value} ${statusNames[key]?.toLowerCase() || key}`).join(', ')}${job.error ? ` ${job.error}` : ''}`;
        ui.JobSummary.classList.toggle('version-error', ['failed', 'interrupted'].includes(job.state) || counts.failed > 0 || counts.unverified > 0);
        ui.JobList.replaceChildren();
        for (const result of job.results) {
            const row = node('div', undefined, 'version-result-row');
            row.append(node('strong', `${result.name} · ${statusNames[result.status] || result.status}`),
                node('span', result.detail || result.error || '', result.status === 'failed' ? 'version-error' : 'version-muted'));
            if (result.error && result.detail) row.append(node('span', result.error, 'version-error'));
            ui.JobList.append(row);
            if (result.status === 'updated' && state.scanJobId === job.id && state.context?.origin === job.origin && String(state.context?.folderID) === String(job.folderID)) {
                const pkg = state.scan?.bots.find(bot => bot.id === result.id)?.packages.find(pkg => pkg.name === job.packageName);
                if (pkg) pkg.version = job.version;
            }
        }
        ui.DownloadReport.disabled = job.state === 'running';
        syncControls();
    }
    async function poll() {
        try {
            const response = await request('getPackageVersionJob');
            state.job = response.job;
            renderJob();
            if (state.job?.state !== 'running') {
                clearInterval(state.poll);
                state.poll = null;
                renderUsage();
            }
        } catch (error) { status(`Could not load update progress: ${error.message}`, true); }
    }
    function startPolling() {
        if (!state.poll) state.poll = setInterval(poll, 1000);
        poll();
    }

    ui.Scan.addEventListener('click', scan);
    ui.BotSearch.addEventListener('input', renderBots);
    ui.SelectAll.addEventListener('change', () => {
        for (const bot of state.scan.bots.filter(bot => bot.editable && !bot.error)) {
            if (ui.SelectAll.checked) state.selected.add(bot.id); else state.selected.delete(bot.id);
        }
        renderPackages();
        renderBots();
    });
    ui.Package.addEventListener('change', loadVersions);
    ui.Target.addEventListener('change', () => { invalidatePreview(); renderRequirements(); syncControls(); });
    ui.PreviewButton.addEventListener('click', preview);
    ui.Apply.addEventListener('click', apply);
    ui.DownloadReport.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(state.job, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({ url, filename: `A360 BotKit Reports/package-update-${state.job.id}.json`, saveAs: true }, () => {
            if (chrome.runtime.lastError) status(chrome.runtime.lastError.message, true);
            URL.revokeObjectURL(url);
        });
    });
    window.addEventListener('beforeunload', () => clearInterval(state.poll));
    document.getElementById('versionUpdateTab').addEventListener('click', () => {
        poll().then(() => { if (state.job?.state === 'running') startPolling(); });
        getTabDetails().then(context => {
            if (!state.scan) ui.Folder.textContent = context?.pageType === 'folder' ? `Current folder · ${context.folderID}` : 'Open a Control Room folder to begin.';
        });
    });
    syncControls();
}
