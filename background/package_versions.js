import { getFolderDetails, listFolderItems } from './control_room.js';

const TASKBOT = 'application/vnd.aa.taskbot';
const DIRECTORY = 'application/vnd.aa.directory';

async function requestJSON(origin, path, authToken, { method = 'GET', body, contentType = 'application/json' } = {}) {
    const token = typeof authToken === 'string' ? authToken.replace(/^"|"$/g, '') : '';
    const response = await fetch(`${origin}${path}`, {
        method,
        headers: { 'Content-Type': contentType, Accept: 'application/json', 'X-Authorization': token },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(25000),
    });
    const text = await response.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (!response.ok) {
        const error = new Error(json?.message || json?.error || `Request failed (HTTP ${response.status})`);
        error.httpStatus = response.status;
        throw error;
    }
    if (text && json === null) throw new Error('Control Room returned an invalid JSON response');
    return json;
}

export function changePackageVersion(content, packageName, version) {
    if (!content || typeof content !== 'object' || Array.isArray(content) || !Array.isArray(content.packages)) {
        throw new Error('Bot content has no valid packages array');
    }
    if (!packageName || typeof version !== 'string' || !version.trim()) throw new Error('Select a package and version');
    const matches = content.packages.filter(pkg => pkg?.name === packageName);
    if (matches.length > 1) throw new Error('Bot contains duplicate package declarations');
    if (!matches.length) return { status: 'skipped', detail: 'Package is not used by this bot' };
    if (matches[0].version === version) return { status: 'unchanged', detail: 'Already at the selected version' };
    const updated = structuredClone(content);
    updated.packages.find(pkg => pkg?.name === packageName).version = version;
    return { status: 'updated', content: updated, previousVersion: matches[0].version };
}

export async function getPackageVersions(origin, packageName, authToken) {
    const versions = [];
    let offset = 0;
    while (true) {
        const json = await requestJSON(origin, '/v2/packages/package/version/list', authToken, {
            method: 'POST',
            body: { fields: [], filter: { operator: 'eq', value: packageName, field: 'name' },
                page: { offset, length: 100 }, sort: [{ field: 'label', direction: 'asc' }] },
        });
        if (!Array.isArray(json?.list)) throw new Error('Invalid package version response');
        versions.push(...json.list);
        offset += json.list.length;
        // total counts all packages; totalFilter counts versions of this package.
        const total = json.page?.totalFilter;
        if (!json.list.length || (Number.isFinite(total) ? offset >= total : json.list.length < 100)) break;
    }
    return versions.filter(pkg => pkg.name === packageName && ['DEFAULT', 'ENABLED'].includes(pkg.status)
        && typeof pkg.packageVersion === 'string' && !pkg.permissions?.botRestriction);
}

export async function scanFolderPackages(origin, folderID, authToken) {
    const root = await getFolderDetails(origin, folderID, authToken);
    if (!root.success) throw new Error(root.error || 'Failed to read the folder');
    const bots = [];
    const visited = new Set();
    const seenBots = new Set();
    const failures = [];
    async function visit(folder, path) {
        if (visited.has(String(folder.id))) return;
        visited.add(String(folder.id));
        const listing = await listFolderItems(origin, folder.id, authToken);
        if (!listing.success) {
            failures.push({ path, error: listing.error });
            return;
        }
        for (const item of listing.items) {
            if (item.type === DIRECTORY) await visit(item, `${path}/${item.name || item.id}`);
            if (item.type !== TASKBOT || seenBots.has(String(item.id))) continue;
            seenBots.add(String(item.id));
            const entry = { id: String(item.id), name: item.name || String(item.id), path: `${path}/${item.name || item.id}`,
                editable: item.permission?.editContent !== false && !item.locked && !item.isEdited, packages: [] };
            try {
                const content = await requestJSON(origin, `/v2/repository/files/${encodeURIComponent(item.id)}/content`, authToken);
                if (!Array.isArray(content?.packages)) throw new Error('Bot has no valid package declarations');
                entry.packages = content.packages;
                if (!entry.editable) entry.error = 'Bot is locked, has unsaved edits, or cannot be edited';
            } catch (error) {
                entry.error = error.message;
                entry.editable = false;
            }
            bots.push(entry);
        }
    }
    await visit(root.folder, root.folder.name || String(folderID));
    return { folder: { id: String(folderID), name: root.folder.name, path: root.folder.path },
        bots, foldersVisited: visited.size, failures };
}

function editRestriction(metadata) {
    if (metadata?.type !== TASKBOT) return 'Only Task Bots can be updated';
    if (metadata.permission?.editContent !== true) return 'No permission to edit this bot';
    if (metadata.locked) return 'Bot is locked; unlock it before updating';
    if (metadata.isEdited) return 'Bot has unsaved editor changes; save or close it first';
    if (typeof metadata.hasErrors !== 'boolean') return 'Could not determine the bot error status';
    if (typeof metadata.contentModifiedTimestamp !== 'string' || !metadata.contentModifiedTimestamp.trim()) {
        return 'Could not determine the bot change timestamp. Scan again.';
    }
    return null;
}

export async function updateBotPackageVersion(origin, bot, packageName, version, authToken) {
    let saved = false;
    let writeAttempted = false;
    try {
        const path = `/v2/repository/files/${encodeURIComponent(bot.id)}`;
        const metadata = await requestJSON(origin, path, authToken);
        let restriction = editRestriction(metadata);
        if (restriction) return { status: 'skipped', detail: restriction };
        const content = await requestJSON(origin, `${path}/content`, authToken);
        const changed = changePackageVersion(content, packageName, version);
        if (changed.status !== 'updated') return changed;
        if (changed.previousVersion !== bot.expectedVersion) {
            return { status: 'skipped', detail: 'Package version changed since the scan. Scan again.' };
        }
        const latest = await requestJSON(origin, path, authToken);
        restriction = editRestriction(latest);
        if (restriction) return { status: 'skipped', detail: restriction };
        if (latest.contentModifiedTimestamp !== metadata.contentModifiedTimestamp || latest.hasErrors !== metadata.hasErrors) {
            return { status: 'skipped', detail: 'Bot changed while reading. Scan again.' };
        }
        // Only content is written. Existing file dependencies are untouched.
        writeAttempted = true;
        await requestJSON(origin, `${path}/content?hasErrors=${metadata.hasErrors}`, authToken, {
            method: 'PUT', body: changed.content, contentType: TASKBOT,
        });
        saved = true;
        const persisted = await requestJSON(origin, `${path}/content`, authToken);
        if (persisted?.packages?.find(pkg => pkg?.name === packageName)?.version !== version) {
            return { status: 'unverified', detail: 'Save was accepted, but the stored version did not match. Scan again.' };
        }
        return { status: 'updated', previousVersion: changed.previousVersion, version,
            detail: `${changed.previousVersion} → ${version}` };
    } catch (error) {
        const uncertain = saved || (writeAttempted && !error.httpStatus);
        return { status: uncertain ? 'unverified' : 'failed', error: error.message,
            ...(uncertain ? { detail: 'The save could not be verified. Scan again before retrying.' } : {}) };
    }
}
