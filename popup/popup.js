// ========================================================================
// DARK MODE TOGGLE - Initialize immediately
// ========================================================================
(function initDarkMode() {
    const savedTheme = localStorage.getItem('botkit-theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        if (document.body) {
            document.body.classList.add('dark-mode');
        }
    }
})();

// ========================================================================
// MAIN APPLICATION
// ========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // ====================================================================
    // DARK MODE SETUP
    // ====================================================================
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    const body = document.body;

    // Apply saved theme
    const savedTheme = localStorage.getItem('botkit-theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (themeLabel) themeLabel.textContent = 'Dark';
    }

    // Toggle theme on click
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const isDark = body.classList.contains('dark-mode');
            if (themeLabel) themeLabel.textContent = isDark ? 'Dark' : 'Light';
            localStorage.setItem('botkit-theme', isDark ? 'dark' : 'light');
        });
    }

    // ====================================================================
    // GET DOM ELEMENTS
    // ====================================================================
    const elements = {
        lineCount: document.getElementById('lineCount'),
        logInput: document.getElementById('logInput'),
        contentInput: document.getElementById('contentInput'),
        copyButton: document.getElementById('copyButton'),
        updateButton: document.getElementById('updateButton'),
        validateButton: document.getElementById('validateButton'),
        patchButton: document.getElementById('patchContent'),
        statusMessage: document.getElementById('statusMessage'),
        popupMessage: document.getElementById('popupMessage'),
        pageStatus: document.getElementById('pageStatus'),
        loader: document.getElementById('loader'),
        refreshButton: document.getElementById('refreshButton'),
        validationFeedback: document.getElementById('validationFeedback'),
        statsReport: document.getElementById('statsReport'),
        statsContent: document.getElementById('statsContent'),
        logActionTab: document.getElementById('logActionTab'),
        copyBotActionTab: document.getElementById('copyBotActionTab'),
        logActionContent: document.getElementById('LogAction'),
        copyBotActionContent: document.getElementById('CopyBotAction')
    };

    // ====================================================================
    // TAB SWITCHING
    // ====================================================================
    function switchTab(tabName) {
        if (tabName === 'LogAction') {
            elements.logActionContent.classList.add('active');
            elements.copyBotActionContent.classList.remove('active');
            elements.logActionTab.classList.add('active');
            elements.copyBotActionTab.classList.remove('active');
        } else {
            elements.logActionContent.classList.remove('active');
            elements.copyBotActionContent.classList.add('active');
            elements.logActionTab.classList.remove('active');
            elements.copyBotActionTab.classList.add('active');
        }
    }

    elements.logActionTab.addEventListener('click', () => switchTab('LogAction'));
    elements.copyBotActionTab.addEventListener('click', () => switchTab('CopyBotAction'));

    // ====================================================================
    // LOADER
    // ====================================================================
    function showLoader() {
        elements.loader.style.display = 'block';
    }

    function hideLoader() {
        elements.loader.style.display = 'none';
    }

    // ====================================================================
    // STATUS MESSAGES
    // ====================================================================
    function showStatus(message, type = 'info') {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = 'show';

        const styles = {
            'info': { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
            'success': { bg: '#ecfdf5', color: '#065f46', border: '#d1fae5' },
            'warning': { bg: '#fffbeb', color: '#92400e', border: '#fef3c7' },
            'error': { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' }
        };

        const style = styles[type] || styles.info;
        elements.statusMessage.style.background = style.bg;
        elements.statusMessage.style.color = style.color;
        elements.statusMessage.style.border = `1px solid ${style.border}`;
    }

    function hideStatus() {
        elements.statusMessage.classList.remove('show');
    }

    // ====================================================================
    // POPUP STATUS
    // ====================================================================
    function showPageStatus(message, type = 'info') {
        elements.popupMessage.textContent = message;
        elements.pageStatus.className = 'info-box';

        if (type === 'success') {
            elements.pageStatus.classList.add('success');
        } else if (type === 'warning') {
            elements.pageStatus.classList.add('warning');
        } else if (type === 'error') {
            elements.pageStatus.classList.add('error');
        }
    }

    // ====================================================================
    // VALIDATION FEEDBACK
    // ====================================================================
    function showValidation(message, type = 'valid', example = null) {
        let text = message;
        if (example) {
            text += '\nExample: ' + example;
        }
        elements.validationFeedback.textContent = text;
        elements.validationFeedback.className = `validation-message show ${type}`;

        // Auto-hide valid messages after 3 seconds
        if (type === 'valid') {
            setTimeout(() => {
                elements.validationFeedback.classList.remove('show');
            }, 3000);
        }
    }

    function hideValidation() {
        elements.validationFeedback.classList.remove('show');
    }

    // ====================================================================
    // STATISTICS REPORT
    // ====================================================================
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
            stats.errors.slice(0, 3).forEach(error => {
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

    // ====================================================================
    // AUTH TOKEN ERROR CHECK
    // ====================================================================
    function checkAuthError() {
        if (elements.statusMessage.textContent.includes('auth token')) {
            elements.refreshButton.style.display = 'block';
        } else {
            elements.refreshButton.style.display = 'none';
        }
    }

    const observer = new MutationObserver(checkAuthError);
    observer.observe(elements.statusMessage, { childList: true, subtree: true });

    // ====================================================================
    // GET TAB DETAILS
    // ====================================================================
    function getTabDetails() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    resolve(null);
                    return;
                }
                chrome.tabs.sendMessage(tabs[0].id, { action: "getTabDetails" }, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve(null);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    // ====================================================================
    // CHECK IF A360 BOT PAGE
    // ====================================================================
    function isA360BotPage(url) {
        if (!url) return false;
        return /#\/bots\/repository\/private\/.*\/\d+\/edit$/.test(url);
    }

    // ====================================================================
    // VALIDATE PLACEHOLDER
    // ====================================================================
    function validatePlaceholder(placeholder) {
        // Empty is valid (auto-detect)
        if (!placeholder || !placeholder.trim()) {
            return {
                valid: true,
                message: '✓ Auto-detection enabled',
                type: 'valid'
            };
        }

        const trimmed = placeholder.trim();

        // Check minimum length
        if (trimmed.length < 2) {
            return {
                valid: false,
                message: '✗ Too short (minimum 2 characters)',
                type: 'invalid'
            };
        }

        // Check for literal placeholders
        const literalKeywords = [
            'line number', 'line_number', 'line-number', 'linenumber', 'linenum',
            'LINE_NUMBER', 'LINE-NUMBER', 'LINENUMBER', 'LINENUM'
        ];

        const hasLiteral = literalKeywords.some(k =>
            trimmed.toLowerCase().includes(k.toLowerCase())
        );

        if (hasLiteral) {
            const example = trimmed
                .replace(/line[_-]?number/gi, '42')
                .replace(/linenum/gi, '42');
            return {
                valid: true,
                message: '✓ Valid literal placeholder',
                example: example,
                type: 'valid'
            };
        }

        // Check if it has numbers (pattern format)
        if (/\d+/.test(trimmed)) {
            const example = trimmed.replace(/\d+/g, '42');
            return {
                valid: true,
                message: '✓ Valid pattern placeholder',
                example: example,
                type: 'valid'
            };
        }

        // Custom placeholder warning
        return {
            valid: true,
            message: '⚠ Custom placeholder - verify it exists in logs',
            type: 'warning'
        };
    }

    // ====================================================================
    // FETCH LINE COUNT
    // ====================================================================
    async function fetchLineCount() {
        showLoader();
        hideStats();

        try {
            const tabDetails = await getTabDetails();

            if (!tabDetails || !tabDetails.authToken) {
                hideLoader();
                showPageStatus('Auth token not found - refresh the page', 'error');
                showStatus('Auth token error. Click refresh button.', 'error');
                elements.lineCount.textContent = 'N/A';
                return;
            }

            const authToken = tabDetails.authToken.slice(1, -1);

            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: "getBotContent",
                    origin: tabDetails.origin,
                    fileID: tabDetails.fileID,
                    authToken
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            hideLoader();

            if (response && response.success) {
                elements.lineCount.textContent = response.lineCount;
                showPageStatus(`Bot loaded: ${response.lineCount} lines`, 'success');
            } else {
                showPageStatus('Error loading bot', 'error');
                showStatus('Failed to load bot: ' + (response.error || 'Unknown error'), 'error');
                elements.lineCount.textContent = 'N/A';
            }
        } catch (error) {
            hideLoader();
            showPageStatus('Error loading bot', 'error');
            showStatus('Error: ' + error.message, 'error');
            elements.lineCount.textContent = 'N/A';
        }
    }

    // ====================================================================
    // HANDLE PAGE LOAD
    // ====================================================================
    async function handlePageLoad() {
        try {
            const tabDetails = await getTabDetails();

            if (!tabDetails || !tabDetails.url) {
                showPageStatus('Could not detect page', 'error');
                return;
            }

            if (isA360BotPage(tabDetails.url)) {
                await fetchLineCount();
            } else {
                showPageStatus('Open an A360 bot editor page', 'warning');
                elements.lineCount.textContent = 'N/A';
            }
        } catch (error) {
            showPageStatus('Error checking page', 'error');
        }
    }

    // ====================================================================
    // VALIDATE BUTTON - Immediate response
    // ====================================================================
    elements.validateButton.addEventListener('click', () => {
        const placeholder = elements.logInput.value;
        const validation = validatePlaceholder(placeholder);

        // Always show validation result
        showValidation(validation.message, validation.type, validation.example);
    });

    // ====================================================================
    // INPUT VALIDATION - Debounced auto-validation
    // ====================================================================
    let validationTimeout;
    elements.logInput.addEventListener('input', () => {
        clearTimeout(validationTimeout);
        hideValidation(); // Clear previous validation

        validationTimeout = setTimeout(() => {
            const placeholder = elements.logInput.value;
            const validation = validatePlaceholder(placeholder);

            // Only show if there's an issue or if it's empty (to confirm auto-detect)
            if (!validation.valid || !placeholder.trim()) {
                showValidation(validation.message, validation.type, validation.example);
            }
        }, 800);
    });

    // ====================================================================
    // UPDATE BUTTON
    // ====================================================================
    elements.updateButton.addEventListener('click', async () => {
        const placeholder = elements.logInput.value.trim();
        const validation = validatePlaceholder(placeholder);

        if (!validation.valid) {
            showStatus(validation.message, 'error');
            showValidation(validation.message, 'invalid');
            return;
        }

        showLoader();
        hideStats();
        hideValidation();

        try {
            const response = await getTabDetails();

            if (!response || !response.authToken) {
                hideLoader();
                showStatus('Auth token error', 'error');
                return;
            }

            if (!isA360BotPage(response.url)) {
                hideLoader();
                showStatus('Open an A360 bot editor page', 'warning');
                return;
            }

            const authToken = response.authToken.slice(1, -1);
            showStatus('Updating bot...', 'info');

            chrome.runtime.sendMessage({
                action: "updateBot",
                origin: response.origin,
                fileID: response.fileID,
                authToken,
                logStructure: placeholder
            }, (updateResponse) => {
                hideLoader();

                if (updateResponse && updateResponse.success) {
                    showStatus('✓ Bot updated! Refreshing page...', 'success');

                    if (updateResponse.stats) {
                        showStats(updateResponse.stats);
                    }

                    // Auto-refresh the A360 page after 1.5 seconds
                    setTimeout(() => {
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs && tabs[0]) {
                                chrome.tabs.reload(tabs[0].id);
                            }
                        });
                    }, 1500);
                } else {
                    showStatus('✗ Update failed: ' + (updateResponse?.error || 'Unknown error'), 'error');
                }
            });
        } catch (error) {
            hideLoader();
            showStatus('Error: ' + error.message, 'error');
        }
    });

    // ====================================================================
    // COPY BUTTON
    // ====================================================================
    elements.copyButton.addEventListener('click', async () => {
        showLoader();

        try {
            const response = await getTabDetails();

            if (!response || !response.authToken || !isA360BotPage(response.url)) {
                hideLoader();
                showStatus('Auth token error or wrong page', 'error');
                return;
            }

            const authToken = response.authToken.slice(1, -1);

            chrome.runtime.sendMessage({
                action: "getBotContent",
                origin: response.origin,
                fileID: response.fileID,
                authToken
            }, (botResponse) => {
                hideLoader();

                if (botResponse && botResponse.success) {
                    navigator.clipboard.writeText(JSON.stringify(botResponse.botContent, null, 2))
                        .then(() => {
                            showStatus('✓ Copied to clipboard!', 'success');
                            setTimeout(hideStatus, 2000);
                        })
                        .catch(() => {
                            showStatus('✗ Copy failed', 'error');
                        });
                } else {
                    showStatus('✗ Failed to get bot content', 'error');
                }
            });
        } catch (error) {
            hideLoader();
            showStatus('Error: ' + error.message, 'error');
        }
    });

    // ====================================================================
    // PATCH BUTTON
    // ====================================================================
    elements.patchButton.addEventListener('click', async () => {
        const content = elements.contentInput.value.trim();

        if (!content) {
            showStatus('✗ Paste content first', 'error');
            return;
        }

        try {
            JSON.parse(content);
        } catch (e) {
            showStatus('✗ Invalid JSON format', 'error');
            return;
        }

        if (!confirm('⚠ This will replace your bot. Have you backed it up?')) {
            return;
        }

        showLoader();

        try {
            const response = await getTabDetails();

            if (!response || !response.authToken || !isA360BotPage(response.url)) {
                hideLoader();
                showStatus('Auth token error or wrong page', 'error');
                return;
            }

            showStatus('Patching bot...', 'info');

            chrome.runtime.sendMessage({
                action: "pastingBotContent",
                origin: response.origin,
                fileID: response.fileID,
                authToken: response.authToken,
                copiedInput: content
            }, (patchResponse) => {
                hideLoader();

                if (patchResponse && patchResponse.success) {
                    showStatus('✓ Bot patched! Refreshing page...', 'success');

                    // Auto-refresh the A360 page after 1.5 seconds
                    setTimeout(() => {
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs && tabs[0]) {
                                chrome.tabs.reload(tabs[0].id);
                            }
                        });
                    }, 1500);
                } else {
                    showStatus('✗ Patch failed: ' + (patchResponse?.error || 'Unknown'), 'error');
                }
            });
        } catch (error) {
            hideLoader();
            showStatus('Error: ' + error.message, 'error');
        }
    });

    // ====================================================================
    // REFRESH BUTTON
    // ====================================================================
    elements.refreshButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                chrome.tabs.reload(tabs[0].id);
            }
        });
    });

    // ====================================================================
    // INITIALIZE
    // ====================================================================
    handlePageLoad();
});