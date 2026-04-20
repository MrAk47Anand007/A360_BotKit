const AUTOSAVE_STORAGE_KEY = 'botkit-autosave';
const DEFAULT_AUTOSAVE_SETTINGS = {
    enabled: false,
    delayMs: 5000,
    mode: 'native',
    fallbackToNative: true
};
const ALLOWED_AUTOSAVE_DELAYS = new Set([3000, 5000, 10000, 15000]);
const ALLOWED_AUTOSAVE_MODES = new Set(['native', 'silent']);
const BOT_EDITOR_URL_REGEX = /#\/bots\/repository\/private\/.*\/\d+\/edit$/;
const BRIDGE_SCRIPT_ID = 'a360-botkit-page-bridge';
const BRIDGE_REQUEST_EVENT = 'A360_BOTKIT_PAGE_REQUEST';
const BRIDGE_RESPONSE_EVENT = 'A360_BOTKIT_PAGE_RESPONSE';
const TOAST_CONTAINER_ID = 'a360-botkit-toast-container';

const autosaveState = {
    settings: DEFAULT_AUTOSAVE_SETTINGS,
    syncTimeout: null,
    pendingSyncReason: null,
    saveTimeout: null,
    saveMonitor: null,
    observer: null,
    heartbeat: null,
    bridgeReadyPromise: null,
    lastSaveAttemptAt: 0,
    lastSavedDigest: null,
    lastSavedAt: null,
    currentFileKey: null,
    status: 'inactive',
    statusDetail: 'Open an A360 bot editor page',
    lastError: null,
    lastModeUsed: null,
    lastToastAt: 0,
    toastCounter: 0
};

function normalizeAutosaveSettings(settings = {}) {
    const delayMs = Number(settings.delayMs);
    const mode = typeof settings.mode === 'string' ? settings.mode.toLowerCase() : DEFAULT_AUTOSAVE_SETTINGS.mode;

    return {
        enabled: Boolean(settings.enabled),
        delayMs: ALLOWED_AUTOSAVE_DELAYS.has(delayMs) ? delayMs : DEFAULT_AUTOSAVE_SETTINGS.delayMs,
        mode: ALLOWED_AUTOSAVE_MODES.has(mode) ? mode : DEFAULT_AUTOSAVE_SETTINGS.mode,
        fallbackToNative: settings.fallbackToNative !== false
    };
}

function isA360BotPage(url = window.location.href) {
    return BOT_EDITOR_URL_REGEX.test(url);
}

function getFileIdFromUrl(url = window.location.href) {
    const parts = url.split('/');
    return parts.length >= 2 ? parts.at(-2) : null;
}

function getCurrentFileKey(url = window.location.href) {
    if (!isA360BotPage(url)) {
        return null;
    }

    const fileID = getFileIdFromUrl(url);
    return fileID ? `${window.location.origin}:${fileID}` : null;
}

function getEditorPage() {
    return document.querySelector('[data-path="EditorPage"]');
}

function getSaveButton() {
    return document.querySelector('button[name="save"]') ||
        [...document.querySelectorAll('button')].find((button) => button.innerText?.trim() === 'Save');
}

function isButtonDisabled(button) {
    return Boolean(
        !button ||
        button.disabled ||
        button.getAttribute('disabled') !== null ||
        button.getAttribute('aria-disabled') === 'true'
    );
}

function getEditorState() {
    const page = getEditorPage();

    return {
        page,
        dirty: page?.getAttribute('data-page-dirty') === 'true',
        working: page?.getAttribute('data-page-working') === 'true'
    };
}

function setAutosaveStatus(status, detail, mode = autosaveState.settings.mode) {
    autosaveState.status = status;
    autosaveState.statusDetail = detail;
    autosaveState.lastModeUsed = mode;
}

function ensureToastContainer() {
    if (!document.body) {
        return null;
    }

    let container = document.getElementById(TOAST_CONTAINER_ID);
    if (container) {
        return container;
    }

    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.position = 'fixed';
    container.style.top = '88px';
    container.style.right = '24px';
    container.style.zIndex = '2147483647';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'flex-end';
    container.style.gap = '10px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
    return container;
}

function getToastPalette(tone) {
    switch (tone) {
        case 'success':
            return {
                background: 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '#10b981',
                text: '#065f46',
                shadow: 'rgba(16, 185, 129, 0.22)'
            };
        case 'warning':
            return {
                background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)',
                border: '#f59e0b',
                text: '#92400e',
                shadow: 'rgba(245, 158, 11, 0.22)'
            };
        case 'error':
            return {
                background: 'linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%)',
                border: '#ef4444',
                text: '#991b1b',
                shadow: 'rgba(239, 68, 68, 0.24)'
            };
        default:
            return {
                background: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)',
                border: '#3b82f6',
                text: '#1d4ed8',
                shadow: 'rgba(59, 130, 246, 0.20)'
            };
    }
}

function showPageToast(title, message, tone = 'info', options = {}) {
    const container = ensureToastContainer();
    if (!container) {
        return;
    }

    const now = Date.now();
    const minIntervalMs = options.minIntervalMs ?? 0;
    if (minIntervalMs > 0 && now - autosaveState.lastToastAt < minIntervalMs) {
        return;
    }

    autosaveState.lastToastAt = now;
    autosaveState.toastCounter += 1;

    const palette = getToastPalette(tone);
    const toast = document.createElement('div');
    toast.dataset.botkitToast = String(autosaveState.toastCounter);
    toast.style.width = 'min(320px, calc(100vw - 32px))';
    toast.style.padding = '12px 14px';
    toast.style.borderRadius = '12px';
    toast.style.border = `1px solid ${palette.border}`;
    toast.style.background = palette.background;
    toast.style.color = palette.text;
    toast.style.boxShadow = `0 14px 30px ${palette.shadow}`;
    toast.style.fontFamily = '"Segoe UI", Arial, sans-serif';
    toast.style.pointerEvents = 'auto';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
    toast.style.backdropFilter = 'blur(10px)';

    const titleNode = document.createElement('div');
    titleNode.textContent = title;
    titleNode.style.fontSize = '13px';
    titleNode.style.fontWeight = '700';
    titleNode.style.marginBottom = message ? '4px' : '0';
    toast.appendChild(titleNode);

    if (message) {
        const messageNode = document.createElement('div');
        messageNode.textContent = message;
        messageNode.style.fontSize = '12px';
        messageNode.style.lineHeight = '1.4';
        toast.appendChild(messageNode);
    }

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    const durationMs = options.durationMs ?? 1800;
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => {
            toast.remove();
            if (!container.childElementCount) {
                container.remove();
            }
        }, 220);
    }, durationMs);
}

function formatTime(timestamp) {
    if (!timestamp) {
        return '';
    }

    try {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        return '';
    }
}

function getBadgeTone(status, mode) {
    switch (status) {
        case 'saved':
            return 'green';
        case 'saving':
            return mode === 'silent' ? 'teal' : 'blue';
        case 'pending':
            return 'yellow';
        case 'error':
            return 'red';
        case 'ready':
            return mode === 'silent' ? 'teal' : 'blue';
        case 'inactive':
        case 'off':
        default:
            return 'gray';
    }
}

function getBadgeLabel(status, mode) {
    switch (status) {
        case 'saved':
            return 'Saved';
        case 'saving':
            return 'Saving';
        case 'pending':
            return 'Pending';
        case 'error':
            return 'Error';
        case 'ready':
            return mode === 'silent' ? 'Silent' : 'Native';
        case 'off':
            return 'Off';
        case 'inactive':
        default:
            return 'Inactive';
    }
}

function getAutosaveStatusSnapshot() {
    const mode = autosaveState.lastModeUsed || autosaveState.settings.mode;
    const status = autosaveState.settings.enabled ? autosaveState.status : 'off';
    const detail = autosaveState.settings.enabled
        ? autosaveState.statusDetail
        : 'Auto save is off';

    return {
        enabled: autosaveState.settings.enabled,
        mode,
        delayMs: autosaveState.settings.delayMs,
        fallbackToNative: autosaveState.settings.fallbackToNative,
        status,
        detail,
        badgeTone: getBadgeTone(status, mode),
        badgeLabel: getBadgeLabel(status, mode),
        lastSavedAt: autosaveState.lastSavedAt,
        lastSavedAtLabel: formatTime(autosaveState.lastSavedAt),
        lastError: autosaveState.lastError,
        pageActive: isA360BotPage(),
    };
}

function clearSaveTimeout() {
    if (autosaveState.saveTimeout) {
        clearTimeout(autosaveState.saveTimeout);
        autosaveState.saveTimeout = null;
    }
}

function clearSaveMonitor() {
    if (autosaveState.saveMonitor) {
        clearInterval(autosaveState.saveMonitor);
        autosaveState.saveMonitor = null;
    }
}

function resetAutosaveCache(fileKey) {
    if (fileKey === autosaveState.currentFileKey) {
        return;
    }

    autosaveState.currentFileKey = fileKey;
    autosaveState.lastSavedDigest = null;
    autosaveState.lastSavedAt = null;
    autosaveState.lastError = null;
    autosaveState.lastModeUsed = autosaveState.settings.mode;
}

function ensurePageBridge() {
    if (autosaveState.bridgeReadyPromise) {
        return autosaveState.bridgeReadyPromise;
    }

    autosaveState.bridgeReadyPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById(BRIDGE_SCRIPT_ID);
        if (existing) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.id = BRIDGE_SCRIPT_ID;
        script.src = chrome.runtime.getURL('content_scripts/page_bridge.js');
        script.async = false;
        script.onload = () => {
            script.remove();
            resolve();
        };
        script.onerror = () => {
            autosaveState.bridgeReadyPromise = null;
            reject(new Error('Failed to load A360 BotKit page bridge'));
        };
        (document.head || document.documentElement).appendChild(script);
    });

    return autosaveState.bridgeReadyPromise;
}

async function callPageBridge(action, payload = {}) {
    await ensurePageBridge();
    return new Promise((resolve, reject) => {
        const requestId = `botkit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const timeout = setTimeout(() => {
            window.removeEventListener(BRIDGE_RESPONSE_EVENT, handleResponse);
            reject(new Error(`Bridge timeout while handling ${action}`));
        }, 3000);

        function handleResponse(event) {
            const detail = event.detail || {};
            if (detail.requestId !== requestId) {
                return;
            }

            clearTimeout(timeout);
            window.removeEventListener(BRIDGE_RESPONSE_EVENT, handleResponse);

            if (detail.ok) {
                resolve(detail.data);
            } else {
                reject(new Error(detail.error || `Bridge action failed: ${action}`));
            }
        }

        window.addEventListener(BRIDGE_RESPONSE_EVENT, handleResponse);
        window.dispatchEvent(new CustomEvent(BRIDGE_REQUEST_EVENT, {
            detail: {
                requestId,
                action,
                payload,
            }
        }));
    });
}

function getRuntimeContext() {
    const origin = window.location.origin;
    const fileID = getFileIdFromUrl();
    const authToken = localStorage.authToken ? String(localStorage.authToken) : null;

    return {
        origin,
        fileID,
        authToken,
        url: window.location.href
    };
}

function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(response);
        });
    });
}

function stableSerialize(value) {
    if (value === null || value === undefined) {
        return 'null';
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return JSON.stringify(value);
    }

    if (typeof value === 'string') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
    }

    if (typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
    }

    return JSON.stringify(String(value));
}

function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).padStart(8, '0');
}

function getPayloadDigest(payload) {
    return hashString(stableSerialize({
        content: payload?.content || null,
        dependencies: Array.isArray(payload?.dependencies) ? payload.dependencies : [],
        hasErrors: Boolean(payload?.hasErrors),
    }));
}

function markSaveAttempt(force = false) {
    const now = Date.now();
    if (!force && now - autosaveState.lastSaveAttemptAt < 1500) {
        return false;
    }

    autosaveState.lastSaveAttemptAt = now;
    return true;
}

function scheduleSync(delay = 50, reason = 'passive') {
    if (reason === 'activity' || !autosaveState.pendingSyncReason) {
        autosaveState.pendingSyncReason = reason;
    }

    if (autosaveState.syncTimeout) {
        clearTimeout(autosaveState.syncTimeout);
    }

    autosaveState.syncTimeout = setTimeout(() => {
        const nextReason = autosaveState.pendingSyncReason || 'passive';
        autosaveState.syncTimeout = null;
        autosaveState.pendingSyncReason = null;
        syncAutosaveState(nextReason);
    }, delay);
}

function shouldScheduleAutosave() {
    if (!isA360BotPage() || !autosaveState.settings.enabled) {
        return false;
    }

    const {dirty, working} = getEditorState();
    if (!dirty || working) {
        return false;
    }

    if (autosaveState.settings.mode === 'silent') {
        return true;
    }

    return !isButtonDisabled(getSaveButton());
}

function refreshStatusFromPageState() {
    if (!isA360BotPage()) {
        setAutosaveStatus('inactive', 'Open an A360 bot editor page');
        return;
    }

    if (!autosaveState.settings.enabled) {
        setAutosaveStatus('off', 'Auto save is off');
        return;
    }

    const {dirty, working} = getEditorState();
    const mode = autosaveState.settings.mode;
    if (working) {
        setAutosaveStatus('saving', mode === 'silent' ? 'Synchronizing with A360…' : 'A360 native save is running…', mode);
        return;
    }

    if (dirty) {
        if (autosaveState.saveTimeout) {
            setAutosaveStatus('pending', `${mode === 'silent' ? 'Silent save' : 'Native save'} will run after ${Math.floor(autosaveState.settings.delayMs / 1000)} seconds`, mode);
            return;
        }

        if (mode === 'native' && isButtonDisabled(getSaveButton())) {
            setAutosaveStatus('pending', 'Waiting for the native Save button to become available', mode);
            return;
        }

        setAutosaveStatus('ready', mode === 'silent' ? 'Silent save is armed' : 'Native save is armed', mode);
        return;
    }

    if (autosaveState.lastSavedAt) {
        setAutosaveStatus('saved', `${mode === 'silent' ? 'Silent' : 'Native'} save completed at ${formatTime(autosaveState.lastSavedAt)}`, mode);
        return;
    }

    setAutosaveStatus('ready', `${mode === 'silent' ? 'Silent' : 'Native'} mode is ready`, mode);
}

function watchSaveCompletion() {
    clearSaveMonitor();

    let pollCount = 0;
    autosaveState.saveMonitor = setInterval(() => {
        pollCount += 1;

        const {dirty, working} = getEditorState();
        if (!dirty && !working) {
            autosaveState.lastSavedAt = Date.now();
            autosaveState.lastError = null;
            setAutosaveStatus('saved', `Native save completed at ${formatTime(autosaveState.lastSavedAt)}`, 'native');
            showPageToast('Autosaved', 'Saved using A360 native save.', 'info', {
                durationMs: 1700,
                minIntervalMs: 12000
            });
            clearSaveMonitor();
            return;
        }

        if (pollCount >= 40) {
            clearSaveMonitor();
            refreshStatusFromPageState();
        }
    }, 500);
}

function triggerNativeAutosave(force = false) {
    if (!markSaveAttempt(force)) {
        return false;
    }

    const saveButton = getSaveButton();
    if (isButtonDisabled(saveButton)) {
        return false;
    }

    autosaveState.lastModeUsed = 'native';
    autosaveState.lastError = null;
    setAutosaveStatus('saving', 'Running native A360 save…', 'native');
    saveButton.click();
    watchSaveCompletion();
    return true;
}

async function markEditorSavedSilently() {
    await callPageBridge('mark-saved');
}

async function runSilentAutosave() {
    if (!markSaveAttempt()) {
        return true;
    }

    autosaveState.lastModeUsed = 'silent';
    autosaveState.lastError = null;
    setAutosaveStatus('saving', 'Saving silently in the background…', 'silent');

    const extracted = await callPageBridge('extract-save-payload');
    const payload = extracted?.payload;
    if (!payload?.content) {
        throw new Error('Silent save payload is missing content');
    }

    const digest = getPayloadDigest(payload);
    if (digest === autosaveState.lastSavedDigest) {
        await markEditorSavedSilently();
        autosaveState.lastSavedAt = autosaveState.lastSavedAt || Date.now();
        setAutosaveStatus('saved', `Silent save already up to date at ${formatTime(autosaveState.lastSavedAt)}`, 'silent');
        return true;
    }

    const context = getRuntimeContext();
    if (!context.origin || !context.fileID || !context.authToken) {
        throw new Error('Silent save is missing page context or auth token');
    }

    const response = await sendRuntimeMessage({
        action: 'silentSaveBot',
        origin: context.origin,
        fileID: context.fileID,
        authToken: context.authToken,
        payload,
    });

    if (!response?.success) {
        throw new Error(response?.error || 'Silent save request failed');
    }

    autosaveState.lastSavedDigest = digest;
    autosaveState.lastSavedAt = Date.now();

    await markEditorSavedSilently();
    setAutosaveStatus('saved', `Silent save completed at ${formatTime(autosaveState.lastSavedAt)}`, 'silent');
    showPageToast('Saved silently', 'Your automation was autosaved in the background.', 'success', {
        durationMs: 1800,
        minIntervalMs: 8000
    });
    return true;
}

async function triggerAutosave() {
    autosaveState.saveTimeout = null;

    if (!shouldScheduleAutosave()) {
        refreshStatusFromPageState();
        return;
    }

    if (autosaveState.settings.mode === 'silent') {
        try {
            await runSilentAutosave();
        } catch (error) {
            autosaveState.lastError = error.message;

            if (autosaveState.settings.fallbackToNative && triggerNativeAutosave(true)) {
                setAutosaveStatus('saving', 'Silent save failed, falling back to native save…', 'native');
                showPageToast('Switching to native save', 'Silent save failed, so A360 native save is being used.', 'warning', {
                    durationMs: 2600
                });
                return;
            }

            setAutosaveStatus('error', `Silent save failed: ${error.message}`, 'silent');
            showPageToast('Autosave failed', error.message, 'error', {
                durationMs: 3200
            });
        }

        return;
    }

    if (!triggerNativeAutosave()) {
        refreshStatusFromPageState();
    }
}

function syncAutosaveState(reason = 'passive') {
    if (!shouldScheduleAutosave()) {
        clearSaveTimeout();
        refreshStatusFromPageState();
        return;
    }

    if (reason === 'activity') {
        clearSaveTimeout();
    }

    if (autosaveState.saveTimeout) {
        refreshStatusFromPageState();
        return;
    }

    autosaveState.saveTimeout = setTimeout(() => {
        triggerAutosave();
    }, autosaveState.settings.delayMs);

    refreshStatusFromPageState();
}

function loadAutosaveSettings() {
    if (!chrome?.storage?.local) {
        autosaveState.settings = DEFAULT_AUTOSAVE_SETTINGS;
        scheduleSync(0, 'passive');
        return;
    }

    chrome.storage.local.get(AUTOSAVE_STORAGE_KEY, (result) => {
        autosaveState.settings = normalizeAutosaveSettings(result[AUTOSAVE_STORAGE_KEY]);
        scheduleSync(0, 'passive');
    });
}

function startAutosaveWatcher() {
    if (autosaveState.observer || !document.body) {
        return;
    }

    ensurePageBridge().catch(() => {
        autosaveState.bridgeReadyPromise = null;
    });

    autosaveState.observer = new MutationObserver(() => {
        scheduleSync(50, 'activity');
    });
    autosaveState.observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'data-page-dirty', 'data-page-working', 'disabled']
    });

    autosaveState.heartbeat = setInterval(() => {
        scheduleSync(0, 'passive');
    }, 1500);
}

function stopAutosaveWatcher() {
    clearSaveTimeout();
    clearSaveMonitor();

    if (autosaveState.syncTimeout) {
        clearTimeout(autosaveState.syncTimeout);
        autosaveState.syncTimeout = null;
    }
    autosaveState.pendingSyncReason = null;

    if (autosaveState.observer) {
        autosaveState.observer.disconnect();
        autosaveState.observer = null;
    }

    if (autosaveState.heartbeat) {
        clearInterval(autosaveState.heartbeat);
        autosaveState.heartbeat = null;
    }
}

function handleLocationChange() {
    const fileKey = getCurrentFileKey();
    resetAutosaveCache(fileKey);

    if (isA360BotPage()) {
        startAutosaveWatcher();
        scheduleSync(0, 'passive');
        return;
    }

    stopAutosaveWatcher();
    refreshStatusFromPageState();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTabDetails') {
        const origin = window.location.origin;
        const fileID = window.location.toString().split('/').slice(-2)[0];
        const url = window.location.href;

        Promise.resolve(localStorage.authToken ? localStorage.authToken.toString() : null)
            .then((authToken) => {
                sendResponse({origin, fileID, authToken, url});
            });

        return true;
    }

    if (request.action === 'getAutosaveStatus') {
        sendResponse(getAutosaveStatusSnapshot());
    }
});

if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes[AUTOSAVE_STORAGE_KEY]) {
            return;
        }

        autosaveState.settings = normalizeAutosaveSettings(changes[AUTOSAVE_STORAGE_KEY].newValue);
        scheduleSync(0, 'passive');
    });
}

window.addEventListener('hashchange', handleLocationChange);
window.addEventListener('focus', () => scheduleSync(0, 'passive'));

loadAutosaveSettings();
handleLocationChange();
