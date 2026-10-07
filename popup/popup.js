// Dark mode must initialize before the popup paints.
(function initDarkMode() {
    const savedTheme = localStorage.getItem('botkit-theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        if (document.body) {
            document.body.classList.add('dark-mode');
        }
    }
})();

const AUTOSAVE_STORAGE_KEY = 'botkit-autosave';
const DEFAULT_AUTOSAVE_SETTINGS = {
    enabled: false,
    delayMs: 5000,
    mode: 'native',
    fallbackToNative: true
};
const ALLOWED_AUTOSAVE_DELAYS = new Set([3000, 5000, 10000, 15000]);
const ALLOWED_AUTOSAVE_MODES = new Set(['native', 'silent']);
const BOT_EDITOR_PATH_REGEX = /^\/bots\/repository\/(?:private|public)\/.+\/(\d+)\/edit$/;
const BOT_FOLDER_PATH_REGEX = /^\/bots\/repository\/(?:private|public)\/folders\/(\d+)$/;
const EXPORT_PREVIEW_CACHE_KEY = 'botkit-export-preview-cache';
const EXPORT_PREVIEW_CACHE_LIMIT = 20;
const EXPORT_DOWNLOAD_ROOT = 'A360 BotKit Exports';
const IMPORTABLE_ASSET_TYPES = {
    'application/vnd.aa.taskbot': {
        label: 'Task Bot',
        fileSuffix: 'taskbot.json',
    },
    'application/vnd.aa.form': {
        label: 'Form',
        fileSuffix: 'form.json',
    },
    'application/vnd.aa.workflow': {
        label: 'Process',
        fileSuffix: 'workflow.json',
    },
};

function normalizeAutosaveSettings(settings = {}) {
    const delayMs = Number(settings.delayMs);
    const mode = typeof settings.mode === 'string'
        ? settings.mode.toLowerCase()
        : DEFAULT_AUTOSAVE_SETTINGS.mode;

    return {
        enabled: Boolean(settings.enabled),
        delayMs: ALLOWED_AUTOSAVE_DELAYS.has(delayMs) ? delayMs : DEFAULT_AUTOSAVE_SETTINGS.delayMs,
        mode: ALLOWED_AUTOSAVE_MODES.has(mode) ? mode : DEFAULT_AUTOSAVE_SETTINGS.mode,
        fallbackToNative: settings.fallbackToNative !== false
    };
}

function loadAutosaveSettings() {
    return new Promise((resolve) => {
        if (!chrome?.storage?.local) {
            resolve(DEFAULT_AUTOSAVE_SETTINGS);
            return;
        }

        chrome.storage.local.get(AUTOSAVE_STORAGE_KEY, (result) => {
            resolve(normalizeAutosaveSettings(result[AUTOSAVE_STORAGE_KEY]));
        });
    });
}

function saveAutosaveSettings(settings) {
    return new Promise((resolve, reject) => {
        if (!chrome?.storage?.local) {
            resolve();
            return;
        }

        chrome.storage.local.set({
            [AUTOSAVE_STORAGE_KEY]: normalizeAutosaveSettings(settings)
        }, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve();
        });
    });
}

function runtimeSendMessage(message) {
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

function downloadFile(url, filename, saveAs = false) {
    return new Promise((resolve, reject) => {
        chrome.downloads.download({
            url,
            filename,
            saveAs,
            conflictAction: 'uniquify',
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(downloadId);
        });
    });
}

function normalizeAuthToken(authToken) {
    if (typeof authToken !== 'string') {
        return '';
    }

    return authToken.startsWith('"') && authToken.endsWith('"')
        ? authToken.slice(1, -1)
        : authToken;
}

function loadExportPreviewCache() {
    return new Promise((resolve) => {
        if (!chrome?.storage?.local) {
            resolve({});
            return;
        }

        chrome.storage.local.get(EXPORT_PREVIEW_CACHE_KEY, (result) => {
            const cache = result?.[EXPORT_PREVIEW_CACHE_KEY];
            resolve(cache && typeof cache === 'object' ? cache : {});
        });
    });
}

function saveExportPreviewCache(cache) {
    return new Promise((resolve, reject) => {
        if (!chrome?.storage?.local) {
            resolve();
            return;
        }

        chrome.storage.local.set({
            [EXPORT_PREVIEW_CACHE_KEY]: cache,
        }, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve();
        });
    });
}

function getPageContextFallback() {
    const botEditorPathRegex = /^\/bots\/repository\/(?:private|public)\/.+\/(\d+)\/edit$/;
    const botFolderPathRegex = /^\/bots\/repository\/(?:private|public)\/folders\/(\d+)$/;
    const url = window.location.href;
    const getHashPath = () => {
        try {
            const parsedUrl = new URL(url, window.location.origin);
            const hash = parsedUrl.hash || '';
            const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;
            return normalizedHash.split('?')[0] || '';
        } catch (error) {
            const [, hash = ''] = String(url).split('#', 2);
            return hash.split('?')[0] ? `/${hash.split('?')[0].replace(/^\/?/, '')}` : '';
        }
    };
    const hashPath = getHashPath();
    const botMatch = hashPath.match(/\/(\d+)\/edit$/) ||
        hashPath.match(/\/(?:task|file|bot|workflow|form)\/(\d+)(?:\/|$)/);
    const folderMatch = hashPath.match(botFolderPathRegex);
    const hasEditorChrome = Boolean(
        document.querySelector('[data-path="EditorPage"]') &&
        (
            document.querySelector('button[name="save"]') ||
            [...document.querySelectorAll('button')].find((button) => button.innerText?.trim() === 'Save')
        )
    );
    const authToken = localStorage.authToken ? String(localStorage.authToken) : null;
    const isBotPage = botEditorPathRegex.test(hashPath) || Boolean(botMatch?.[1]) || hasEditorChrome;

    return {
        origin: window.location.origin,
        fileID: botMatch?.[1] || null,
        folderID: folderMatch?.[1] || null,
        pageType: isBotPage ? 'bot' : folderMatch ? 'folder' : 'other',
        authToken,
        url,
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');

    const elements = {
        saveStateBadge: document.getElementById('saveStateBadge'),
        saveStateCaption: document.getElementById('saveStateCaption'),
        loader: document.getElementById('loader'),
        statusMessage: document.getElementById('statusMessage'),
        refreshButton: document.getElementById('refreshButton'),

        logActionTab: document.getElementById('logActionTab'),
        copyBotActionTab: document.getElementById('copyBotActionTab'),
        exportBotTab: document.getElementById('exportBotTab'),
        importActionTab: document.getElementById('importActionTab'),
        settingsTab: document.getElementById('settingsTab'),

        logActionContent: document.getElementById('LogAction'),
        copyBotActionContent: document.getElementById('CopyBotAction'),
        exportBotActionContent: document.getElementById('ExportBotAction'),
        importActionContent: document.getElementById('ImportAction'),
        settingsContent: document.getElementById('SettingsAction'),

        pageStatus: document.getElementById('pageStatus'),
        popupMessage: document.getElementById('popupMessage'),
        lineCount: document.getElementById('lineCount'),
        logInput: document.getElementById('logInput'),
        validationFeedback: document.getElementById('validationFeedback'),
        validateButton: document.getElementById('validateButton'),
        updateButton: document.getElementById('updateButton'),
        statsReport: document.getElementById('statsReport'),
        statsContent: document.getElementById('statsContent'),

        contentInput: document.getElementById('contentInput'),
        copyButton: document.getElementById('copyButton'),
        patchButton: document.getElementById('patchContent'),

        exportPageStatus: document.getElementById('exportPageStatus'),
        exportPopupMessage: document.getElementById('exportPopupMessage'),
        exportProgress: document.getElementById('exportProgress'),
        exportProgressLabel: document.getElementById('exportProgressLabel'),
        exportProgressFill: document.getElementById('exportProgressFill'),
        exportProgressMeta: document.getElementById('exportProgressMeta'),
        importProgress: document.getElementById('importProgress'),
        importProgressLabel: document.getElementById('importProgressLabel'),
        importProgressFill: document.getElementById('importProgressFill'),
        importProgressMeta: document.getElementById('importProgressMeta'),
        exportFolderName: document.getElementById('exportFolderName'),
        exportAssetCount: document.getElementById('exportAssetCount'),
        exportFolderCount: document.getElementById('exportFolderCount'),
        exportTypeBreakdown: document.getElementById('exportTypeBreakdown'),
        exportRefreshButton: document.getElementById('exportRefreshButton'),
        chooseExportFolderButton: document.getElementById('chooseExportFolderButton'),
        downloadExportButton: document.getElementById('downloadExportButton'),
        exportHint: document.getElementById('exportHint'),
        importZipInput: document.getElementById('importZipInput'),
        chooseImportZipButton: document.getElementById('chooseImportZipButton'),
        startImportButton: document.getElementById('startImportButton'),
        importZipName: document.getElementById('importZipName'),
        importFolderName: document.getElementById('importFolderName'),
        importAssetCount: document.getElementById('importAssetCount'),
        importTypeBreakdown: document.getElementById('importTypeBreakdown'),
        importHint: document.getElementById('importHint'),

        autosaveToggle: document.getElementById('autosaveToggle'),
        autosaveDelay: document.getElementById('autosaveDelay'),
        autosaveMode: document.getElementById('autosaveMode'),
        autosaveFallback: document.getElementById('autosaveFallback'),
        autosaveStatus: document.getElementById('autosaveStatus'),
    };

    const state = {
        autosaveSettings: DEFAULT_AUTOSAVE_SETTINGS,
        autosaveStatusPoll: null,
        validationTimeout: null,
        currentTabDetails: null,
        exportPreview: null,
        exportBundle: null,
        exportBundleKey: null,
        exportPreviewCache: {},
        exportBusy: false,
        importBusy: false,
        importBundle: null,
        importFileName: '',
    };

    const savedTheme = localStorage.getItem('botkit-theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (themeLabel) {
            themeLabel.textContent = 'Dark';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const isDark = body.classList.contains('dark-mode');
            if (themeLabel) {
                themeLabel.textContent = isDark ? 'Dark' : 'Light';
            }
            localStorage.setItem('botkit-theme', isDark ? 'dark' : 'light');
        });
    }

    function getA360HashPath(url = '') {
        try {
            const parsedUrl = new URL(url || window.location.href, window.location.origin);
            const hash = parsedUrl.hash || '';
            const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;
            return normalizedHash.split('?')[0] || '';
        } catch (error) {
            const [, hash = ''] = String(url || '').split('#', 2);
            return hash.split('?')[0] ? `/${hash.split('?')[0].replace(/^\/?/, '')}` : '';
        }
    }

    function isA360BotPage(url) {
        const hashPath = getA360HashPath(url || '');
        return BOT_EDITOR_PATH_REGEX.test(hashPath) ||
            /\/(?:task|file|bot|workflow|form)\/(\d+)(?:\/|$)/.test(hashPath);
    }

    function isA360FolderPage(url) {
        return BOT_FOLDER_PATH_REGEX.test(getA360HashPath(url || ''));
    }

    function showLoader() {
        elements.loader.style.display = 'block';
    }

    function hideLoader() {
        elements.loader.style.display = 'none';
    }

    function showStatus(message, type = 'info') {
        const styles = {
            info: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
            success: { bg: '#ecfdf5', color: '#065f46', border: '#d1fae5' },
            warning: { bg: '#fffbeb', color: '#92400e', border: '#fef3c7' },
            error: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' }
        };

        const style = styles[type] || styles.info;
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = 'show';
        elements.statusMessage.style.background = style.bg;
        elements.statusMessage.style.color = style.color;
        elements.statusMessage.style.border = `1px solid ${style.border}`;
    }

    function hideStatus() {
        elements.statusMessage.classList.remove('show');
    }

    function showInfoBox(boxElement, textElement, message, type = 'info') {
        textElement.textContent = message;
        boxElement.className = 'info-box';
        if (type === 'success') {
            boxElement.classList.add('success');
        } else if (type === 'warning') {
            boxElement.classList.add('warning');
        } else if (type === 'error') {
            boxElement.classList.add('error');
        }
    }

    function showPageStatus(message, type = 'info') {
        showInfoBox(elements.pageStatus, elements.popupMessage, message, type);
    }

    function showExportPageStatus(message, type = 'info') {
        showInfoBox(elements.exportPageStatus, elements.exportPopupMessage, message, type);
    }

    function switchTab(tabName) {
        const tabs = [
            [elements.logActionTab, elements.logActionContent, 'LogAction'],
            [elements.copyBotActionTab, elements.copyBotActionContent, 'CopyBotAction'],
            [elements.exportBotTab, elements.exportBotActionContent, 'ExportBotAction'],
            [elements.importActionTab, elements.importActionContent, 'ImportAction'],
            [elements.settingsTab, elements.settingsContent, 'SettingsAction'],
        ];

        tabs.forEach(([button, content, name]) => {
            const isActive = name === tabName;
            button.classList.toggle('active', isActive);
            content.classList.toggle('active', isActive);
        });
    }

    elements.logActionTab.addEventListener('click', () => switchTab('LogAction'));
    elements.copyBotActionTab.addEventListener('click', () => switchTab('CopyBotAction'));
    elements.exportBotTab.addEventListener('click', () => switchTab('ExportBotAction'));
    elements.importActionTab.addEventListener('click', () => switchTab('ImportAction'));
    elements.settingsTab.addEventListener('click', () => switchTab('SettingsAction'));

    function renderHeaderBadge(status = {}) {
        const badgeTone = status.badgeTone || 'gray';
        const badgeLabel = status.badgeLabel || 'Inactive';
        const detail = status.detail || 'Open an A360 bot editor page';

        elements.saveStateBadge.textContent = badgeLabel;
        elements.saveStateBadge.className = `status-badge ${badgeTone}`;
        elements.saveStateCaption.textContent = detail;
    }

    function renderContextualHeaderBadge() {
        const tabDetails = state.currentTabDetails;
        if (tabDetails?.pageType === 'folder' && isA360FolderPage(tabDetails.url)) {
            const assetCount = state.exportPreview?.totals?.assets || 0;
            renderHeaderBadge({
                badgeTone: assetCount > 0 ? 'teal' : 'blue',
                badgeLabel: 'Folder',
                detail: assetCount > 0
                    ? `${assetCount} assets ready to export`
                    : 'Folder page ready for export'
            });
            return true;
        }

        if (tabDetails?.pageType === 'bot' && isA360BotPage(tabDetails.url)) {
            renderHeaderBadge({
                badgeTone: 'blue',
                badgeLabel: 'Editor',
                detail: 'Checking autosave state'
            });
            return true;
        }

        return false;
    }

    async function getAutosaveStatus() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    resolve(null);
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, { action: 'getAutosaveStatus' }, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve(null);
                    } else {
                        resolve(response || null);
                    }
                });
            });
        });
    }

    async function refreshAutosaveBadge() {
        const status = await getAutosaveStatus();
        if (!status) {
            if (renderContextualHeaderBadge()) {
                return;
            }
            renderHeaderBadge({
                badgeTone: 'gray',
                badgeLabel: 'Inactive',
                detail: 'Open an A360 bot editor page'
            });
            return;
        }

        renderHeaderBadge(status);
    }

    function startAutosaveBadgePolling() {
        if (state.autosaveStatusPoll) {
            clearInterval(state.autosaveStatusPoll);
        }

        refreshAutosaveBadge();
        state.autosaveStatusPoll = setInterval(refreshAutosaveBadge, 1500);
    }

    function renderAutosaveSettings() {
        const delaySeconds = Math.floor(state.autosaveSettings.delayMs / 1000);
        const modeLabel = state.autosaveSettings.mode === 'silent' ? 'Silent' : 'Native';

        elements.autosaveToggle.checked = state.autosaveSettings.enabled;
        elements.autosaveDelay.value = String(state.autosaveSettings.delayMs);
        elements.autosaveMode.value = state.autosaveSettings.mode;
        elements.autosaveFallback.checked = state.autosaveSettings.fallbackToNative;
        elements.autosaveDelay.disabled = !state.autosaveSettings.enabled;
        elements.autosaveMode.disabled = !state.autosaveSettings.enabled;
        elements.autosaveFallback.disabled = !state.autosaveSettings.enabled || state.autosaveSettings.mode !== 'silent';
        elements.autosaveStatus.textContent = state.autosaveSettings.enabled
            ? state.autosaveSettings.mode === 'silent'
                ? `Auto save is on. Silent mode runs after ${delaySeconds} seconds and ${state.autosaveSettings.fallbackToNative ? 'can' : 'will not'} fall back to native Save.`
                : `Auto save is on. ${modeLabel} Save runs after ${delaySeconds} seconds of idle changes.`
            : 'Auto save is off';
    }

    async function persistAutosaveSettings(nextSettings) {
        state.autosaveSettings = normalizeAutosaveSettings(nextSettings);
        renderAutosaveSettings();

        try {
            await saveAutosaveSettings(state.autosaveSettings);
            refreshAutosaveBadge();
        } catch (error) {
            showStatus(`Failed to save auto save setting: ${error.message}`, 'error');
        }
    }

    function getTabDetails() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    resolve(null);
                    return;
                }

                const activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, { action: 'getTabDetails' }, (response) => {
                    if (!chrome.runtime.lastError && response) {
                        resolve(response);
                        return;
                    }

                    if (!chrome.scripting?.executeScript || !activeTab?.id) {
                        resolve(null);
                        return;
                    }

                    chrome.scripting.executeScript({
                        target: { tabId: activeTab.id },
                        func: getPageContextFallback,
                    }, (results) => {
                        if (chrome.runtime.lastError) {
                            resolve(null);
                            return;
                        }

                        const result = Array.isArray(results) ? results[0]?.result : null;
                        resolve(result || null);
                    });
                });
            });
        });
    }

    function validatePlaceholder(placeholder) {
        if (!placeholder || !placeholder.trim()) {
            return {
                valid: true,
                message: 'Auto detection is enabled.',
                type: 'valid'
            };
        }

        const trimmed = placeholder.trim();
        if (trimmed.length < 2) {
            return {
                valid: false,
                message: 'Too short. Use at least 2 characters.',
                type: 'invalid'
            };
        }

        const literalKeywords = [
            'line number', 'line_number', 'line-number', 'linenumber', 'linenum',
            'LINE_NUMBER', 'LINE-NUMBER', 'LINENUMBER', 'LINENUM'
        ];

        const hasLiteral = literalKeywords.some((keyword) => trimmed.toLowerCase().includes(keyword.toLowerCase()));
        if (hasLiteral) {
            return {
                valid: true,
                message: 'Literal placeholder looks valid.',
                example: trimmed
                    .replace(/line[_-]?number/gi, '42')
                    .replace(/linenum/gi, '42'),
                type: 'valid'
            };
        }

        if (/\d+/.test(trimmed)) {
            return {
                valid: true,
                message: 'Pattern placeholder looks valid.',
                example: trimmed.replace(/\d+/g, '42'),
                type: 'valid'
            };
        }

        return {
            valid: true,
            message: 'Custom placeholder detected. Verify it exists in your logs.',
            type: 'warning'
        };
    }

    function showValidation(message, type = 'valid', example = null) {
        let text = message;
        if (example) {
            text += ` Example: ${example}`;
        }
        elements.validationFeedback.textContent = text;
        elements.validationFeedback.className = `validation-message show ${type}`;

        if (type === 'valid') {
            setTimeout(() => {
                elements.validationFeedback.classList.remove('show');
            }, 3000);
        }
    }

    function hideValidation() {
        elements.validationFeedback.classList.remove('show');
    }

    function showStats(stats) {
        const successRate = parseFloat(stats.successRate) || 0;

        let html = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${successRate}%"></div>
            </div>
            <div class="stats-grid">
                <div class="stats-item">Total: <strong>${stats.totalLogsFound}</strong></div>
                <div class="stats-item">Updated: <strong>${stats.logsUpdated}</strong></div>
                <div class="stats-item">Skipped: <strong>${stats.logsSkipped}</strong></div>
                <div class="stats-item">Rate: <strong>${stats.successRate}</strong></div>
            </div>
        `;

        if (stats.placeholderUsed) {
            html += `<div class="stats-item" style="margin-top: 6px;">Pattern: <strong>${stats.placeholderUsed}</strong></div>`;
        }

        if (stats.errors && stats.errors.length > 0) {
            html += '<div class="error-list">';
            html += '<div class="stats-item"><strong>Errors:</strong></div>';
            stats.errors.slice(0, 3).forEach((error) => {
                html += `<div class="error-item">Line ${error.line}: ${error.message}</div>`;
            });
            if (stats.errors.length > 3) {
                html += `<div class="error-item">...and ${stats.errors.length - 3} more</div>`;
            }
            html += '</div>';
        }

        elements.statsContent.innerHTML = html;
        elements.statsReport.classList.add('show');
    }

    function hideStats() {
        elements.statsReport.classList.remove('show');
    }

    function checkAuthError() {
        if (elements.statusMessage.textContent.toLowerCase().includes('auth token')) {
            elements.refreshButton.style.display = 'block';
        } else {
            elements.refreshButton.style.display = 'none';
        }
    }

    const statusObserver = new MutationObserver(checkAuthError);
    statusObserver.observe(elements.statusMessage, { childList: true, subtree: true });

    function sanitizeSegment(value, fallback = 'item') {
        const nextValue = String(value || fallback)
            .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
            .replace(/\.+$/g, '')
            .trim();

        return nextValue || fallback;
    }

    function countAssetsByType(items = []) {
        return items.reduce((result, item) => {
            switch (item?.metadata?.type || item?.type) {
                case 'application/vnd.aa.taskbot':
                    result.taskBots += 1;
                    break;
                case 'application/vnd.aa.form':
                    result.forms += 1;
                    break;
                case 'application/vnd.aa.workflow':
                    result.workflows += 1;
                    break;
                default:
                    break;
            }
            return result;
        }, {
            taskBots: 0,
            forms: 0,
            workflows: 0,
        });
    }

    function getImportRootFolderName(bundle) {
        const manifestName = typeof bundle?.folder?.name === 'string'
            ? bundle.folder.name.trim()
            : '';

        if (manifestName) {
            return manifestName;
        }

        const zipName = typeof bundle?.zipFileName === 'string'
            ? bundle.zipFileName.replace(/[.]zip$/i, '').trim()
            : '';

        return zipName || 'Imported Folder';
    }

    function getExportCacheKey(tabDetails) {
        if (!tabDetails?.origin || !tabDetails?.folderID) {
            return null;
        }

        return `${tabDetails.origin}|${tabDetails.folderID}|${tabDetails.url || ''}`;
    }

    function getCachedExportPreview(tabDetails) {
        const cacheKey = getExportCacheKey(tabDetails);
        if (!cacheKey) {
            return null;
        }

        return state.exportPreviewCache?.[cacheKey] || null;
    }

    async function setCachedExportPreview(tabDetails, preview) {
        const cacheKey = getExportCacheKey(tabDetails);
        if (!cacheKey) {
            return;
        }

        const nextCache = {
            ...state.exportPreviewCache,
            [cacheKey]: {
                updatedAt: Date.now(),
                preview,
            }
        };

        const orderedKeys = Object.keys(nextCache)
            .sort((leftKey, rightKey) => (nextCache[rightKey]?.updatedAt || 0) - (nextCache[leftKey]?.updatedAt || 0));

        while (orderedKeys.length > EXPORT_PREVIEW_CACHE_LIMIT) {
            const keyToDelete = orderedKeys.pop();
            delete nextCache[keyToDelete];
        }

        state.exportPreviewCache = nextCache;
        await saveExportPreviewCache(nextCache);
    }

    function showExportProgress(label, percent, meta, { indeterminate = false } = {}) {
        elements.exportProgress.classList.add('show');
        elements.exportProgress.classList.toggle('indeterminate', indeterminate);
        elements.exportProgressLabel.textContent = label;
        elements.exportProgressMeta.textContent = meta;
        elements.exportProgressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    }

    function hideExportProgress() {
        elements.exportProgress.classList.remove('show', 'indeterminate');
        elements.exportProgressFill.style.width = '0%';
        elements.exportProgressLabel.textContent = 'Preparing export…';
        elements.exportProgressMeta.textContent = 'Please wait while A360 BotKit works through the current folder.';
    }

    function showImportProgress(label, percent, meta, { indeterminate = false } = {}) {
        elements.importProgress.classList.add('show');
        elements.importProgress.classList.toggle('indeterminate', indeterminate);
        elements.importProgressLabel.textContent = label;
        elements.importProgressMeta.textContent = meta;
        elements.importProgressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    }

    function hideImportProgress() {
        elements.importProgress.classList.remove('show', 'indeterminate');
        elements.importProgressFill.style.width = '0%';
        elements.importProgressLabel.textContent = 'Preparing import…';
        elements.importProgressMeta.textContent = 'Please wait while A360 BotKit reads your ZIP file.';
    }

    function syncTransferControls() {
        const hasExportAssets = (state.exportPreview?.totals?.assets || 0) > 0;
        const hasImportBundle = Boolean(state.importBundle);
        const onFolderPage = state.currentTabDetails?.pageType === 'folder' && isA360FolderPage(state.currentTabDetails?.url);
        const anyBusy = state.exportBusy || state.importBusy;

        elements.chooseExportFolderButton.disabled = anyBusy || !hasExportAssets;
        elements.downloadExportButton.disabled = anyBusy || !hasExportAssets;
        elements.exportRefreshButton.disabled = anyBusy;
        elements.chooseImportZipButton.disabled = anyBusy;
        elements.startImportButton.disabled = anyBusy || !hasImportBundle || !onFolderPage;
    }

    function setExportControlsBusy(isBusy) {
        state.exportBusy = Boolean(isBusy);
        syncTransferControls();
    }

    function setImportControlsBusy(isBusy) {
        state.importBusy = Boolean(isBusy);
        syncTransferControls();
    }

    function buildExportManifest(bundle) {
        return {
            exportedAt: bundle.exportedAt,
            folder: bundle.folder,
            totals: bundle.totals,
            items: bundle.items.map((item) => ({
                id: item.id,
                folderId: item.folderId,
                name: item.name,
                exportPath: item.exportPath,
                metadata: item.metadata,
            })),
            failures: bundle.failures || [],
        };
    }

    function getExportEntries(bundle) {
        const rootFolderName = `${sanitizeSegment(bundle.folder?.name, 'A360 Export')} (${bundle.folder?.id || 'root'})`;
        const entries = bundle.items.map((item) => ({
            path: [
                rootFolderName,
                ...(Array.isArray(item.relativeFolders) ? item.relativeFolders.map((segment) => sanitizeSegment(segment, 'Folder')) : []),
                sanitizeSegment(item.exportPath?.at(-1), `${sanitizeSegment(item.name)}.json`)
            ].join('/'),
            content: JSON.stringify(item.content, null, 2),
            lastModified: item.metadata?.lastModified || bundle.exportedAt,
        }));

        entries.push({
            path: [rootFolderName, 'export-manifest.json'].join('/'),
            content: JSON.stringify(buildExportManifest(bundle), null, 2),
            lastModified: bundle.exportedAt,
        });

        return {
            rootFolderName,
            entries,
        };
    }

    function crc32(bytes) {
        let crc = 0 ^ (-1);
        for (let index = 0; index < bytes.length; index += 1) {
            crc ^= bytes[index];
            for (let bit = 0; bit < 8; bit += 1) {
                crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
            }
        }
        return (crc ^ (-1)) >>> 0;
    }

    function getDosDateTime(value) {
        const date = value ? new Date(value) : new Date();
        const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
        const year = Math.max(1980, safeDate.getFullYear());
        const dosTime = (
            ((safeDate.getHours() & 0x1f) << 11) |
            ((safeDate.getMinutes() & 0x3f) << 5) |
            ((Math.floor(safeDate.getSeconds() / 2)) & 0x1f)
        ) & 0xffff;
        const dosDate = (
            (((year - 1980) & 0x7f) << 9) |
            (((safeDate.getMonth() + 1) & 0x0f) << 5) |
            (safeDate.getDate() & 0x1f)
        ) & 0xffff;

        return { dosTime, dosDate };
    }

    function createZipBlob(entries) {
        const encoder = new TextEncoder();
        const localParts = [];
        const centralParts = [];
        let offset = 0;

        entries.forEach((entry) => {
            const fileNameBytes = encoder.encode(entry.path.replace(/\\/g, '/'));
            const dataBytes = encoder.encode(entry.content);
            const checksum = crc32(dataBytes);
            const { dosTime, dosDate } = getDosDateTime(entry.lastModified);

            const localHeader = new Uint8Array(30 + fileNameBytes.length);
            const localView = new DataView(localHeader.buffer);
            localView.setUint32(0, 0x04034b50, true);
            localView.setUint16(4, 20, true);
            localView.setUint16(6, 0x0800, true);
            localView.setUint16(8, 0, true);
            localView.setUint16(10, dosTime, true);
            localView.setUint16(12, dosDate, true);
            localView.setUint32(14, checksum, true);
            localView.setUint32(18, dataBytes.length, true);
            localView.setUint32(22, dataBytes.length, true);
            localView.setUint16(26, fileNameBytes.length, true);
            localView.setUint16(28, 0, true);
            localHeader.set(fileNameBytes, 30);
            localParts.push(localHeader, dataBytes);

            const centralHeader = new Uint8Array(46 + fileNameBytes.length);
            const centralView = new DataView(centralHeader.buffer);
            centralView.setUint32(0, 0x02014b50, true);
            centralView.setUint16(4, 20, true);
            centralView.setUint16(6, 20, true);
            centralView.setUint16(8, 0x0800, true);
            centralView.setUint16(10, 0, true);
            centralView.setUint16(12, dosTime, true);
            centralView.setUint16(14, dosDate, true);
            centralView.setUint32(16, checksum, true);
            centralView.setUint32(20, dataBytes.length, true);
            centralView.setUint32(24, dataBytes.length, true);
            centralView.setUint16(28, fileNameBytes.length, true);
            centralView.setUint16(30, 0, true);
            centralView.setUint16(32, 0, true);
            centralView.setUint16(34, 0, true);
            centralView.setUint16(36, 0, true);
            centralView.setUint32(38, 0, true);
            centralView.setUint32(42, offset, true);
            centralHeader.set(fileNameBytes, 46);
            centralParts.push(centralHeader);

            offset += localHeader.byteLength + dataBytes.byteLength;
        });

        const centralDirectorySize = centralParts.reduce((total, part) => total + part.byteLength, 0);
        const endOfCentralDirectory = new Uint8Array(22);
        const endView = new DataView(endOfCentralDirectory.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(4, 0, true);
        endView.setUint16(6, 0, true);
        endView.setUint16(8, entries.length, true);
        endView.setUint16(10, entries.length, true);
        endView.setUint32(12, centralDirectorySize, true);
        endView.setUint32(16, offset, true);
        endView.setUint16(20, 0, true);

        return new Blob([...localParts, ...centralParts, endOfCentralDirectory], {
            type: 'application/zip'
        });
    }

    function findEndOfCentralDirectory(view) {
        const minimumLength = 22;
        const maxCommentLength = 0xffff;
        const startOffset = Math.max(0, view.byteLength - minimumLength - maxCommentLength);

        for (let offset = view.byteLength - minimumLength; offset >= startOffset; offset -= 1) {
            if (view.getUint32(offset, true) === 0x06054b50) {
                return offset;
            }
        }

        return -1;
    }

    function parseZipEntries(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        const decoder = new TextDecoder('utf-8');
        const eocdOffset = findEndOfCentralDirectory(view);

        if (eocdOffset === -1) {
            throw new Error('Invalid ZIP file: end-of-central-directory record was not found');
        }

        const totalEntries = view.getUint16(eocdOffset + 10, true);
        const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
        const entries = [];
        let cursor = centralDirectoryOffset;

        for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
            if (view.getUint32(cursor, true) !== 0x02014b50) {
                throw new Error('Invalid ZIP file: central-directory entry is corrupt');
            }

            const compressionMethod = view.getUint16(cursor + 10, true);
            const compressedSize = view.getUint32(cursor + 20, true);
            const uncompressedSize = view.getUint32(cursor + 24, true);
            const fileNameLength = view.getUint16(cursor + 28, true);
            const extraFieldLength = view.getUint16(cursor + 30, true);
            const commentLength = view.getUint16(cursor + 32, true);
            const localHeaderOffset = view.getUint32(cursor + 42, true);
            const fileNameBytes = new Uint8Array(arrayBuffer, cursor + 46, fileNameLength);
            const path = decoder.decode(fileNameBytes);

            if (compressionMethod !== 0) {
                throw new Error(`Unsupported ZIP compression method for ${path || 'entry'}. Re-export the ZIP with A360 BotKit and try again.`);
            }

            if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
                throw new Error(`Invalid ZIP file: local header is corrupt for ${path || 'entry'}`);
            }

            const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
            const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
            const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
            const dataBytes = new Uint8Array(arrayBuffer, dataStart, compressedSize);

            entries.push({
                path,
                bytes: dataBytes,
                text: decoder.decode(dataBytes),
                size: uncompressedSize,
            });

            cursor += 46 + fileNameLength + extraFieldLength + commentLength;
        }

        return entries.filter((entry) => entry.path && !entry.path.endsWith('/'));
    }

    function buildImportEntryPath(rootFolderName, item) {
        const exportPath = Array.isArray(item?.exportPath) ? item.exportPath : [];
        const typeConfig = IMPORTABLE_ASSET_TYPES[item?.metadata?.type];
        const fallbackFileName = `${sanitizeSegment(item?.name, 'asset')}.${typeConfig?.fileSuffix || 'json'}`;
        const segments = [
            rootFolderName,
            ...exportPath.map((segment, index) => sanitizeSegment(
                segment,
                index === exportPath.length - 1 ? fallbackFileName : 'Folder'
            )),
        ].filter(Boolean);

        return segments.join('/');
    }

    function parseExportZipBundle(fileName, arrayBuffer) {
        const entries = parseZipEntries(arrayBuffer);
        const manifestEntry = entries.find((entry) => entry.path.endsWith('/export-manifest.json') || entry.path === 'export-manifest.json');
        if (!manifestEntry) {
            throw new Error('This ZIP does not contain an A360 BotKit export manifest.');
        }

        let manifest;
        try {
            manifest = JSON.parse(manifestEntry.text);
        } catch (error) {
            throw new Error('The export manifest is not valid JSON.');
        }

        if (!Array.isArray(manifest?.items)) {
            throw new Error('The export manifest is missing its items list.');
        }

        const rootFolderName = manifestEntry.path.includes('/')
            ? manifestEntry.path.slice(0, manifestEntry.path.lastIndexOf('/'))
            : '';
        const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));

        const items = manifest.items.map((item, index) => {
            const assetType = item?.metadata?.type;
            if (!IMPORTABLE_ASSET_TYPES[assetType]) {
                throw new Error(`Item ${index + 1} has an unsupported asset type.`);
            }

            const expectedPath = buildImportEntryPath(rootFolderName, item);
            const contentEntry = entriesByPath.get(expectedPath);
            if (!contentEntry) {
                throw new Error(`Missing exported JSON for ${item?.name || `item ${index + 1}`}.`);
            }

            let content;
            try {
                content = JSON.parse(contentEntry.text);
            } catch (error) {
                throw new Error(`The JSON for ${item?.name || `item ${index + 1}`} is invalid.`);
            }

            const exportPath = Array.isArray(item.exportPath) ? item.exportPath : [];
            const relativeFolders = exportPath.slice(0, -1);

            return {
                id: item.id,
                name: item.name || `Imported asset ${index + 1}`,
                type: assetType,
                platform: item?.metadata?.platform || 'WINDOWS',
                relativeFolders,
                exportPath,
                metadata: item.metadata || {},
                content,
            };
        });

        return {
            zipFileName: fileName,
            folder: manifest.folder || { name: 'Imported Folder' },
            totals: manifest.totals || {},
            items,
            failures: Array.isArray(manifest.failures) ? manifest.failures : [],
        };
    }

    function toPathKey(parts = []) {
        return parts.join('/');
    }

    function collectImportFolderPaths(bundle) {
        const uniquePaths = new Set();
        (bundle?.items || []).forEach((item) => {
            const folderSegments = Array.isArray(item.relativeFolders) ? item.relativeFolders : [];
            let current = [];
            folderSegments.forEach((segment) => {
                current = [...current, segment];
                uniquePaths.add(toPathKey(current));
            });
        });

        return [...uniquePaths]
            .map((path) => path.split('/'))
            .sort((left, right) => left.length - right.length || left.join('/').localeCompare(right.join('/')));
    }

    async function parseImportZipFile(file) {
        if (!file) {
            throw new Error('Choose an A360 BotKit export ZIP first.');
        }

        if (!file.name.toLowerCase().endsWith('.zip')) {
            throw new Error('Only .zip files exported by A360 BotKit are supported.');
        }

        const buffer = await file.arrayBuffer();
        return parseExportZipBundle(file.name, buffer);
    }

    async function writeTextFile(directoryHandle, fileName, content) {
        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }

    async function writeBlobFile(directoryHandle, fileName, blob) {
        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
    }

    async function writeBundleToDirectory(bundle, parentDirectoryHandle) {
        const { rootFolderName } = getExportEntries(bundle);
        const rootHandle = await parentDirectoryHandle.getDirectoryHandle(rootFolderName, { create: true });

        for (const item of bundle.items) {
            let currentDirectoryHandle = rootHandle;
            const relativeFolders = Array.isArray(item.relativeFolders) ? item.relativeFolders : [];

            for (const folderName of relativeFolders) {
                currentDirectoryHandle = await currentDirectoryHandle.getDirectoryHandle(
                    sanitizeSegment(folderName, 'Folder'),
                    { create: true }
                );
            }

            const fileName = sanitizeSegment(item.exportPath?.at(-1), `${sanitizeSegment(item.name)}.json`);
            await writeTextFile(currentDirectoryHandle, fileName, JSON.stringify(item.content, null, 2));
        }

        await writeTextFile(
            rootHandle,
            'export-manifest.json',
            JSON.stringify(buildExportManifest(bundle), null, 2)
        );

        return rootFolderName;
    }

    async function writeBundleZipToDirectory(bundle, parentDirectoryHandle) {
        const { rootFolderName, entries } = getExportEntries(bundle);
        const zipBlob = createZipBlob(entries);
        const zipFileName = `${rootFolderName}.zip`;
        await writeBlobFile(parentDirectoryHandle, zipFileName, zipBlob);
        return zipFileName;
    }

    function downloadTextAsFile(content, filename, saveAs = false) {
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        return downloadFile(url, filename, saveAs)
            .finally(() => {
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
    }

    async function downloadBundleToDefaultFolder(bundle) {
        const { rootFolderName, entries } = getExportEntries(bundle);
        const zipBlob = createZipBlob(entries);
        const zipFileName = [EXPORT_DOWNLOAD_ROOT, `${rootFolderName}.zip`].join('/');
        const zipUrl = URL.createObjectURL(zipBlob);
        await downloadFile(zipUrl, zipFileName, false)
            .finally(() => {
                setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
            });
        return rootFolderName;
    }

    function resetExportPreview() {
        state.exportPreview = null;
        state.exportBundle = null;
        state.exportBundleKey = null;
        elements.exportFolderName.textContent = 'N/A';
        elements.exportAssetCount.textContent = '0';
        elements.exportFolderCount.textContent = '0';
        elements.exportTypeBreakdown.textContent = '0 / 0 / 0';
        setExportControlsBusy(false);
        elements.exportHint.textContent = 'Open an A360 folder page to scan supported assets recursively.';
        hideExportProgress();
    }

    function renderExportPreview(preview) {
        state.exportPreview = preview;

        if (!preview) {
            resetExportPreview();
            return;
        }

        elements.exportFolderName.textContent = preview.folder?.name || 'N/A';
        elements.exportAssetCount.textContent = String(preview.totals?.assets || 0);
        elements.exportFolderCount.textContent = String(preview.totals?.foldersVisited || 0);
        elements.exportTypeBreakdown.textContent = `${preview.totals?.taskBots || 0} / ${preview.totals?.forms || 0} / ${preview.totals?.workflows || 0}`;
        setExportControlsBusy(false);
        elements.exportHint.textContent = preview.totals?.assets > 0
            ? `Ready to export ${preview.totals.assets} assets from ${preview.totals.foldersVisited} folders.`
            : 'No supported task bots, forms, or processes were found under this folder.';
    }

    function resetImportBundle() {
        state.importBundle = null;
        state.importFileName = '';
        elements.importZipInput.value = '';
        elements.importZipName.textContent = 'None';
        elements.importFolderName.textContent = 'N/A';
        elements.importAssetCount.textContent = '0';
        elements.importTypeBreakdown.textContent = '0 / 0 / 0';
        elements.importHint.textContent = 'Pick an A360 BotKit export ZIP first. Import only supports ZIP files created by this extension.';
        hideImportProgress();
        syncTransferControls();
    }

    function renderImportBundle(bundle, fileName) {
        const counts = countAssetsByType(bundle?.items || []);
        state.importBundle = bundle;
        state.importFileName = fileName || '';
        elements.importZipName.textContent = fileName || 'Selected';
        elements.importFolderName.textContent = getImportRootFolderName(bundle);
        elements.importAssetCount.textContent = String(bundle?.items?.length || 0);
        elements.importTypeBreakdown.textContent = `${counts.taskBots} / ${counts.forms} / ${counts.workflows}`;
        elements.importHint.textContent = bundle?.items?.length
            ? `ZIP validated. ${bundle.items.length} assets are ready to import, starting by creating the parent folder ${getImportRootFolderName(bundle)} inside the current folder.`
            : 'The ZIP was read, but no supported assets were found.';
        syncTransferControls();
    }

    async function fetchExportPreview(tabDetails, options = {}) {
        if (!tabDetails?.origin || !tabDetails?.folderID || !tabDetails?.authToken) {
            resetExportPreview();
            showExportPageStatus('Open an A360 folder page to export supported assets recursively.', 'warning');
            return null;
        }

        const cacheKey = getExportCacheKey(tabDetails);
        state.exportBundle = null;
        state.exportBundleKey = null;

        if (!options.forceRefresh) {
            const cachedEntry = getCachedExportPreview(tabDetails);
            if (cachedEntry?.preview) {
                renderExportPreview(cachedEntry.preview);
                const lastUpdated = new Date(cachedEntry.updatedAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                });
                showExportPageStatus(`Showing cached scan results from ${lastUpdated}. Use Refresh Scan if the folder changed.`, 'info');
                return cachedEntry.preview;
            }
        }

        setExportControlsBusy(true);
        showExportProgress('Scanning folders and assets', 28, 'Looking through the current folder and its child folders.', {
            indeterminate: true
        });
        showExportPageStatus('Scanning folders and assets...', 'info');
        try {
            const response = await runtimeSendMessage({
                action: 'getFolderExportPreview',
                origin: tabDetails.origin,
                folderID: tabDetails.folderID,
                authToken: normalizeAuthToken(tabDetails.authToken),
            });

            if (!response?.success) {
                throw new Error(response?.error || 'Failed to scan the current folder');
            }

            await setCachedExportPreview(tabDetails, response);
            renderExportPreview(response);
            showExportProgress('Scan complete', 100, `Found ${response.totals?.assets || 0} supported assets across ${response.totals?.foldersVisited || 0} folders.`);
            setTimeout(hideExportProgress, 600);
            if ((response.totals?.assets || 0) > 0) {
                showExportPageStatus('Asset scan complete. Choose how you want to export.', 'success');
            } else {
                showExportPageStatus('Folder scan complete, but no supported assets were found.', 'warning');
            }
            return response;
        } finally {
            setExportControlsBusy(false);
        }
    }

    async function requestExportBundle(tabDetails) {
        const cacheKey = getExportCacheKey(tabDetails);
        if (state.exportBundle && state.exportBundleKey === cacheKey) {
            return state.exportBundle;
        }

        showExportProgress('Preparing export bundle', 45, 'Fetching asset contents from Control Room so the export is complete.');
        const response = await runtimeSendMessage({
            action: 'getFolderBotExportBundle',
            origin: tabDetails.origin,
            folderID: tabDetails.folderID,
            authToken: normalizeAuthToken(tabDetails.authToken),
        });

        if (!response?.success || !response.bundle) {
            throw new Error(response?.error || 'Failed to build the export bundle');
        }

        state.exportBundle = response.bundle;
        state.exportBundleKey = cacheKey;
        return response.bundle;
    }

    async function promptForImportZip() {
        return new Promise((resolve) => {
            const input = elements.importZipInput;
            const handleChange = () => {
                input.removeEventListener('change', handleChange);
                resolve(input.files?.[0] || null);
            };

            input.value = '';
            input.addEventListener('change', handleChange, { once: true });
            input.click();
        });
    }

    async function handleChooseImportZip() {
        try {
            setImportControlsBusy(true);
            const file = await promptForImportZip();
            if (!file) {
                showStatus('ZIP selection was cancelled.', 'warning');
                return;
            }

            showImportProgress('Reading export ZIP', 18, 'Validating the selected ZIP and loading its manifest.');
            const bundle = await parseImportZipFile(file);
            renderImportBundle(bundle, file.name);
            showImportProgress('ZIP ready', 100, `Loaded ${bundle.items.length} assets from ${file.name}.`);
            setTimeout(hideImportProgress, 700);
            showExportPageStatus(`Ready to import ${bundle.items.length} assets from ${file.name}.`, 'success');
            showStatus('Export ZIP loaded successfully.', 'success');
        } catch (error) {
            resetImportBundle();
            hideImportProgress();
            showExportPageStatus(`Import ZIP rejected: ${error.message}`, 'error');
            showStatus(`Import ZIP rejected: ${error.message}`, 'error');
        } finally {
            setImportControlsBusy(false);
        }
    }

    async function handleStartImport() {
        const tabDetails = state.currentTabDetails;
        const bundle = state.importBundle;

        if (!tabDetails || tabDetails.pageType !== 'folder' || !tabDetails.folderID) {
            showStatus('Open an A360 folder page before importing.', 'warning');
            showExportPageStatus('Open an A360 folder page before importing.', 'warning');
            return;
        }

        if (!tabDetails.authToken) {
            showStatus('Auth token not found. Refresh the A360 page and try again.', 'error');
            showExportPageStatus('Auth token not found. Refresh the A360 page and try again.', 'error');
            return;
        }

        if (!bundle?.items?.length) {
            showStatus('Choose a valid A360 BotKit export ZIP first.', 'warning');
            return;
        }

        const folderPaths = collectImportFolderPaths(bundle);
        const rootFolderName = getImportRootFolderName(bundle);
        const totalSteps = 1 + folderPaths.length + (bundle.items.length * 2);
        let completedSteps = 0;
        const failures = [];
        const folderIdByPath = new Map();
        const createdAssets = [];
        let importRootFolderId = null;

        try {
            setImportControlsBusy(true);
            showExportPageStatus(`Importing ${bundle.items.length} assets into ${state.exportPreview?.folder?.name || 'the current folder'}...`, 'info');

            showImportProgress(
                'Creating import root folder',
                Math.round((completedSteps / Math.max(totalSteps, 1)) * 100),
                `Creating ${rootFolderName} inside the currently open A360 folder.`
            );

            const rootFolderResponse = await runtimeSendMessage({
                action: 'createRepositoryFolder',
                origin: tabDetails.origin,
                parentFolderID: tabDetails.folderID,
                folderName: rootFolderName,
                authToken: normalizeAuthToken(tabDetails.authToken),
            });

            if (!rootFolderResponse?.success || !rootFolderResponse.folder?.id) {
                throw new Error(rootFolderResponse?.error || `Failed to create root folder ${rootFolderName}`);
            }

            importRootFolderId = rootFolderResponse.folder.id;
            folderIdByPath.set('', importRootFolderId);
            completedSteps += 1;

            for (const pathParts of folderPaths) {
                const pathKey = toPathKey(pathParts);
                const parentParts = pathParts.slice(0, -1);
                const parentKey = toPathKey(parentParts);
                const parentFolderID = folderIdByPath.get(parentKey);
                const folderName = pathParts.at(-1);

                showImportProgress(
                    'Creating folder structure',
                    Math.round((completedSteps / Math.max(totalSteps, 1)) * 100),
                    `Ensuring folder ${pathParts.join(' / ')} exists in the target location.`
                );

                const response = await runtimeSendMessage({
                    action: 'createRepositoryFolder',
                    origin: tabDetails.origin,
                    parentFolderID,
                    folderName,
                    authToken: normalizeAuthToken(tabDetails.authToken),
                });

                if (!response?.success || !response.folder?.id) {
                    failures.push({
                        name: folderName,
                        stage: 'create-folder',
                        error: response?.error || 'Folder creation failed',
                    });
                    throw new Error(`Failed to prepare folder ${pathParts.join(' / ')}`);
                }

                folderIdByPath.set(pathKey, response.folder.id);
                completedSteps += 1;
            }

            for (const item of bundle.items) {
                const folderKey = toPathKey(item.relativeFolders || []);
                const parentFolderID = folderIdByPath.get(folderKey) || importRootFolderId;

                showImportProgress(
                    'Creating repository assets',
                    Math.round((completedSteps / Math.max(totalSteps, 1)) * 100),
                    `Creating ${item.name} in ${item.relativeFolders?.join(' / ') || rootFolderName}.`
                );

                const createResponse = await runtimeSendMessage({
                    action: 'createRepositoryAsset',
                    origin: tabDetails.origin,
                    parentFolderID,
                    authToken: normalizeAuthToken(tabDetails.authToken),
                    asset: {
                        name: item.name,
                        type: item.type,
                        platform: item.platform,
                    },
                });

                completedSteps += 1;

                if (!createResponse?.success || !createResponse.asset?.id) {
                    failures.push({
                        name: item.name,
                        stage: 'create-asset',
                        error: createResponse?.error || 'Asset creation failed',
                    });
                    continue;
                }

                showImportProgress(
                    'Uploading asset content',
                    Math.round((completedSteps / Math.max(totalSteps, 1)) * 100),
                    `Uploading the JSON content for ${item.name}.`
                );

                const contentResponse = await runtimeSendMessage({
                    action: 'putRepositoryAssetContent',
                    origin: tabDetails.origin,
                    fileID: createResponse.asset.id,
                    assetType: item.type,
                    content: item.content,
                    authToken: normalizeAuthToken(tabDetails.authToken),
                });

                completedSteps += 1;

                if (!contentResponse?.success) {
                    failures.push({
                        name: item.name,
                        stage: 'upload-content',
                        error: contentResponse?.error || 'Content upload failed',
                    });
                    continue;
                }

                createdAssets.push(item.name);
            }

            showImportProgress(
                failures.length ? 'Import finished with warnings' : 'Import complete',
                100,
                failures.length
                    ? `${createdAssets.length} assets imported and ${failures.length} items need attention.`
                    : `${createdAssets.length} assets were imported successfully.`
            );
            setTimeout(hideImportProgress, 1000);

            if (failures.length) {
                const firstFailure = failures[0];
                showExportPageStatus(
                    `Imported ${createdAssets.length} assets into ${rootFolderName} with ${failures.length} warning(s). First issue: ${firstFailure.name} - ${firstFailure.error}`,
                    'warning'
                );
                showStatus(`Import completed with ${failures.length} warning(s).`, 'warning');
            } else {
                showExportPageStatus(`Imported ${createdAssets.length} assets into ${rootFolderName}.`, 'success');
                showStatus('Import completed successfully.', 'success');
            }

            if (createdAssets.length > 0) {
                state.exportBundle = null;
                state.exportBundleKey = null;
                await refreshPageState({ forceRefresh: true });
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs?.[0]?.id) {
                        chrome.tabs.reload(tabs[0].id);
                    }
                });
            }
        } catch (error) {
            hideImportProgress();
            showExportPageStatus(`Import failed: ${error.message}`, 'error');
            showStatus(`Import failed: ${error.message}`, 'error');
        } finally {
            setImportControlsBusy(false);
        }
    }

    async function handleChooseFolderExport() {
        const tabDetails = state.currentTabDetails;
        if (!tabDetails || tabDetails.pageType !== 'folder' || !tabDetails.folderID) {
            showStatus('Open an A360 folder page before exporting.', 'warning');
            showExportPageStatus('Open an A360 folder page before exporting.', 'warning');
            return;
        }

        if (typeof window.showDirectoryPicker !== 'function') {
            showStatus('Folder picker is not available here. Use the default download option instead.', 'warning');
            return;
        }

        try {
            setExportControlsBusy(true);
            const directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            showExportProgress('Preparing export bundle', 42, 'Fetching the latest asset contents for the selected folder.');
            const bundle = await requestExportBundle(tabDetails);
            showExportProgress('Packaging zip file', 82, `Creating one ZIP file for ${bundle.totals?.assetsExported || 0} exported assets in your chosen directory.`);
            const writtenZipName = await writeBundleZipToDirectory(bundle, directoryHandle);
            showExportProgress('Export complete', 100, `Saved ${bundle.totals?.assetsExported || 0} assets into ${writtenZipName}.`);
            setTimeout(hideExportProgress, 900);
            showExportPageStatus(`Exported ${bundle.totals?.assetsExported || 0} assets to ${writtenZipName}.`, 'success');
            showStatus('ZIP export completed in the selected folder.', 'success');
        } catch (error) {
            hideExportProgress();
            if (error?.name === 'AbortError') {
                showStatus('Folder selection was cancelled.', 'warning');
                return;
            }
            showExportPageStatus(`Export failed: ${error.message}`, 'error');
            showStatus(`Export failed: ${error.message}`, 'error');
        } finally {
            setExportControlsBusy(false);
        }
    }

    async function handleDefaultDownloadExport() {
        const tabDetails = state.currentTabDetails;
        if (!tabDetails || tabDetails.pageType !== 'folder' || !tabDetails.folderID) {
            showStatus('Open an A360 folder page before exporting.', 'warning');
            showExportPageStatus('Open an A360 folder page before exporting.', 'warning');
            return;
        }

        try {
            setExportControlsBusy(true);
            const bundle = await requestExportBundle(tabDetails);
            showExportProgress('Packaging zip download', 78, `Creating a single zip file for ${bundle.totals?.assetsExported || 0} exported assets.`);
            const downloadFolderName = await downloadBundleToDefaultFolder(bundle);
            showExportProgress('Zip download queued', 100, `A zip file for ${bundle.totals?.assetsExported || 0} assets was sent to your Downloads folder.`);
            setTimeout(hideExportProgress, 900);
            showExportPageStatus(`Queued a zip export for ${bundle.totals?.assetsExported || 0} assets under ${downloadFolderName}.`, 'success');
            showStatus('A single zip file was sent to your Downloads folder.', 'success');
        } catch (error) {
            hideExportProgress();
            showExportPageStatus(`Export failed: ${error.message}`, 'error');
            showStatus(`Export failed: ${error.message}`, 'error');
        } finally {
            setExportControlsBusy(false);
        }
    }

    async function fetchLineCount(tabDetails) {
        showLoader();
        hideStats();

        try {
            if (!tabDetails?.authToken || !tabDetails?.fileID) {
                hideLoader();
                showPageStatus('Auth token not found. Refresh the page and try again.', 'error');
                showStatus('Auth token error. Use the refresh button and try again.', 'error');
                elements.lineCount.textContent = 'N/A';
                return;
            }

            const response = await runtimeSendMessage({
                action: 'getBotContent',
                origin: tabDetails.origin,
                fileID: tabDetails.fileID,
                authToken: normalizeAuthToken(tabDetails.authToken),
            });

            hideLoader();

            if (response?.success) {
                elements.lineCount.textContent = String(response.lineCount);
                showPageStatus(`Bot loaded with ${response.lineCount} lines.`, 'success');
            } else {
                elements.lineCount.textContent = 'N/A';
                showPageStatus('Failed to load the bot content.', 'error');
                showStatus(`Failed to load bot: ${response?.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            hideLoader();
            elements.lineCount.textContent = 'N/A';
            showPageStatus('Error loading the bot.', 'error');
            showStatus(`Error: ${error.message}`, 'error');
        }
    }

    async function refreshPageState(options = {}) {
        hideStatus();
        const tabDetails = await getTabDetails();
        state.currentTabDetails = tabDetails;
        syncTransferControls();
        refreshAutosaveBadge();

        if (!tabDetails?.url) {
            elements.lineCount.textContent = 'N/A';
            showPageStatus('Could not detect the active page.', 'error');
            resetExportPreview();
            showExportPageStatus('Could not detect the active page.', 'error');
            return;
        }

        if (tabDetails.pageType === 'bot' && isA360BotPage(tabDetails.url)) {
            await fetchLineCount(tabDetails);
        } else {
            elements.lineCount.textContent = 'N/A';
            showPageStatus('Open an A360 bot editor page to use Update Bot.', 'warning');
        }

        if (tabDetails.pageType === 'folder' && isA360FolderPage(tabDetails.url)) {
            try {
                await fetchExportPreview(tabDetails, options);
            } catch (error) {
                resetExportPreview();
                showExportPageStatus(`Failed to scan folder: ${error.message}`, 'error');
                showStatus(`Folder scan failed: ${error.message}`, 'error');
            }
        } else {
            resetExportPreview();
            showExportPageStatus('Open an A360 folder page to export or import supported assets recursively.', 'warning');
        }

        syncTransferControls();
    }

    elements.validateButton.addEventListener('click', () => {
        const validation = validatePlaceholder(elements.logInput.value);
        showValidation(validation.message, validation.type, validation.example);
    });

    elements.logInput.addEventListener('input', () => {
        clearTimeout(state.validationTimeout);
        hideValidation();

        state.validationTimeout = setTimeout(() => {
            const validation = validatePlaceholder(elements.logInput.value);
            if (!validation.valid || !elements.logInput.value.trim()) {
                showValidation(validation.message, validation.type, validation.example);
            }
        }, 800);
    });

    elements.updateButton.addEventListener('click', async () => {
        const placeholder = elements.logInput.value.trim();
        const validation = validatePlaceholder(placeholder);
        if (!validation.valid) {
            showValidation(validation.message, 'invalid');
            showStatus(validation.message, 'error');
            return;
        }

        showLoader();
        hideStats();
        hideValidation();

        try {
            const tabDetails = await getTabDetails();
            if (!tabDetails?.authToken || tabDetails.pageType !== 'bot' || !isA360BotPage(tabDetails.url)) {
                hideLoader();
                showStatus('Open an A360 bot editor page before updating.', 'warning');
                return;
            }

            showStatus('Updating the bot...', 'info');
            const response = await runtimeSendMessage({
                action: 'updateBot',
                origin: tabDetails.origin,
                fileID: tabDetails.fileID,
                authToken: normalizeAuthToken(tabDetails.authToken),
                logStructure: placeholder,
            });

            hideLoader();

            if (response?.success) {
                showStatus('Bot updated. Refreshing the page...', 'success');
                if (response.stats) {
                    showStats(response.stats);
                }

                setTimeout(() => {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs?.[0]) {
                            chrome.tabs.reload(tabs[0].id);
                        }
                    });
                }, 1500);
                setTimeout(hideStatus, 3500);
            } else {
                showStatus(`Update failed: ${response?.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            hideLoader();
            showStatus(`Error: ${error.message}`, 'error');
        }
    });

    elements.copyButton.addEventListener('click', async () => {
        showLoader();
        try {
            const tabDetails = await getTabDetails();
            if (!tabDetails?.authToken || tabDetails.pageType !== 'bot' || !isA360BotPage(tabDetails.url)) {
                hideLoader();
                showStatus('Open an A360 bot editor page before copying.', 'warning');
                return;
            }

            const response = await runtimeSendMessage({
                action: 'getBotContent',
                origin: tabDetails.origin,
                fileID: tabDetails.fileID,
                authToken: normalizeAuthToken(tabDetails.authToken),
            });

            hideLoader();

            if (!response?.success) {
                showStatus('Failed to get bot content.', 'error');
                return;
            }

            await navigator.clipboard.writeText(JSON.stringify(response.botContent, null, 2));
            showStatus('Bot content copied to the clipboard.', 'success');
            setTimeout(hideStatus, 2000);
        } catch (error) {
            hideLoader();
            showStatus(`Error: ${error.message}`, 'error');
        }
    });

    elements.patchButton.addEventListener('click', async () => {
        const content = elements.contentInput.value.trim();
        if (!content) {
            showStatus('Paste bot JSON first.', 'error');
            return;
        }

        try {
            JSON.parse(content);
        } catch (error) {
            showStatus('Invalid JSON format.', 'error');
            return;
        }

        if (!window.confirm('This will replace your bot content. Continue only if you have a backup.')) {
            return;
        }

        showLoader();
        try {
            const tabDetails = await getTabDetails();
            if (!tabDetails?.authToken || tabDetails.pageType !== 'bot' || !isA360BotPage(tabDetails.url)) {
                hideLoader();
                showStatus('Open an A360 bot editor page before patching.', 'warning');
                return;
            }

            showStatus('Patching the bot...', 'info');
            const response = await runtimeSendMessage({
                action: 'pastingBotContent',
                origin: tabDetails.origin,
                fileID: tabDetails.fileID,
                authToken: normalizeAuthToken(tabDetails.authToken),
                copiedInput: content,
            });

            hideLoader();

            if (response?.success) {
                showStatus('Bot patched. Refreshing the page...', 'success');
                setTimeout(() => {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs?.[0]) {
                            chrome.tabs.reload(tabs[0].id);
                        }
                    });
                }, 1500);
                setTimeout(hideStatus, 3500);
            } else {
                showStatus(`Patch failed: ${response?.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            hideLoader();
            showStatus(`Error: ${error.message}`, 'error');
        }
    });

    elements.chooseExportFolderButton.addEventListener('click', handleChooseFolderExport);
    elements.downloadExportButton.addEventListener('click', handleDefaultDownloadExport);
    elements.chooseImportZipButton.addEventListener('click', handleChooseImportZip);
    elements.startImportButton.addEventListener('click', handleStartImport);
    elements.exportRefreshButton.addEventListener('click', async () => {
        state.exportBundle = null;
        state.exportBundleKey = null;
        await refreshPageState({ forceRefresh: true });
    });

    elements.refreshButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs?.[0]) {
                chrome.tabs.reload(tabs[0].id);
            }
        });
    });

    elements.autosaveToggle.addEventListener('change', () => {
        persistAutosaveSettings({
            ...state.autosaveSettings,
            enabled: elements.autosaveToggle.checked
        });
    });

    elements.autosaveDelay.addEventListener('change', () => {
        persistAutosaveSettings({
            ...state.autosaveSettings,
            delayMs: Number(elements.autosaveDelay.value)
        });
    });

    elements.autosaveMode.addEventListener('change', () => {
        persistAutosaveSettings({
            ...state.autosaveSettings,
            mode: elements.autosaveMode.value
        });
    });

    elements.autosaveFallback.addEventListener('change', () => {
        persistAutosaveSettings({
            ...state.autosaveSettings,
            fallbackToNative: elements.autosaveFallback.checked
        });
    });

    window.addEventListener('beforeunload', () => {
        if (state.autosaveStatusPoll) {
            clearInterval(state.autosaveStatusPoll);
            state.autosaveStatusPoll = null;
        }
    });

    (async () => {
        state.autosaveSettings = await loadAutosaveSettings();
        state.exportPreviewCache = await loadExportPreviewCache();
        renderAutosaveSettings();
        startAutosaveBadgePolling();
        resetExportPreview();
        resetImportBundle();
        await refreshPageState();
    })();
});
