import {
    calculateTotalLines,
    updateLogMessages,
    getBotContent,
    putBotJSONContent,
    putBotJSONContentPaste,
    silentSaveBot,
    getFolderExportPreview,
    getFolderBotExportBundle,
    createFolder,
    createRepositoryAsset,
    putRepositoryAssetContent,
} from '../background/control_room.js';
import { scanFolderPackages, getPackageVersions } from './package_versions.js';
import { runPackageVersionJob } from './package_version_job.js';

const PACKAGE_JOB_KEY = 'botkit-package-version-job';
let packageJobRunning = false;

async function getPackageJob() {
    const stored = await chrome.storage.session.get(PACKAGE_JOB_KEY);
    const job = stored[PACKAGE_JOB_KEY] || null;
    // A browser/worker restart must never silently resume writes with stale state.
    if (job?.state === 'running' && !packageJobRunning) {
        job.state = 'interrupted';
        job.error = 'Update interrupted. Scan again to check current versions before retrying.';
        await chrome.storage.session.set({ [PACKAGE_JOB_KEY]: job });
    }
    return job;
}

async function startPackageJob(request) {
    if (packageJobRunning) throw new Error('A package update is already running');
    if (!Array.isArray(request.bots) || !request.bots.length || !request.packageName || !request.version) {
        throw new Error('Select bots, a package, and a version');
    }
    const uniqueBots = [...new Map(request.bots.map(bot => [String(bot.id), bot])).values()];
    if (uniqueBots.some(bot => !/^\d+$/.test(String(bot.id)) || typeof bot.expectedVersion !== 'string')) {
        throw new Error('Invalid bot selection. Scan again.');
    }
    const jobRequest = { id: crypto.randomUUID(), origin: request.origin, folderID: request.folderID,
        folderName: request.folderName, packageName: request.packageName, version: request.version,
        bots: uniqueBots.map(bot => ({ id: String(bot.id), name: bot.name, path: bot.path, expectedVersion: bot.expectedVersion })) };
    packageJobRunning = true;
    try {
        const { bots: selectedBots, ...jobDetails } = jobRequest;
        const initial = { ...jobDetails, state: 'running', total: selectedBots.length, completed: 0, results: [] };
        await chrome.storage.session.set({ [PACKAGE_JOB_KEY]: initial });
        let latestJob = initial;
        // Background ownership lets the popup close without cancelling the batch.
        runPackageVersionJob(jobRequest, request.authToken, job => {
            latestJob = structuredClone(job);
            return chrome.storage.session.set({ [PACKAGE_JOB_KEY]: latestJob });
        })
            .catch(async error => {
                await chrome.storage.session.set({ [PACKAGE_JOB_KEY]: { ...latestJob, state: 'failed', error: error.message } });
            }).finally(() => { packageJobRunning = false; });
        return { success: true, job: initial };
    } catch (error) {
        packageJobRunning = false;
        throw error;
    }
}

/**
 * Backgound worker which will listener different actions/messages from extension.
 * Returns response based on action got in message.
 */
(async function () {
    // Event listener for messages from other parts of the extension
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (['scanFolderPackages', 'getPackageVersions', 'startPackageVersionUpdate', 'getPackageVersionJob'].includes(request.action)) {
        const task = async () => {
            if (request.action === 'getPackageVersionJob') return { success: true, job: await getPackageJob() };
            const url = new URL(request.origin);
            if (!['https:', 'http:'].includes(url.protocol) || url.origin !== request.origin || !request.authToken) {
                throw new Error('Open an authenticated Control Room folder');
            }
            if (request.action === 'scanFolderPackages') return { success: true, scan: await scanFolderPackages(request.origin, request.folderID, request.authToken) };
            if (request.action === 'getPackageVersions') return { success: true, versions: await getPackageVersions(request.origin, request.packageName, request.authToken) };
            return startPackageJob(request);
        };
        task().then(sendResponse).catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
        if (request.action === "getBotContent") {
            // Handle request to get bot content
            getBotContent(request.origin, request.fileID, request.authToken)
                .then((response) => {
                    if (response && response.success) {
                        try {
                            let lineCount = calculateTotalLines(response.botContent); // Calculate line count
                            console.log("Calculated line count:", lineCount);
                            sendResponse({
                                success: true,
                                lineCount,
                                botContent: response.botContent,
                            }); // Send success response with line count
                        } catch (error) {
                            console.error("Error in calculateTotalLines:", error);
                            sendResponse({ success: false, error: "Error counting lines" }); // Send error response if calculation fails
                        }
                    } else {
                        console.error("Failed to get bot content:", response);
                        sendResponse({
                            success: false,
                            error: "Failed to get bot content",
                        }); // Send error response if fetching fails
                    }
                })
                .catch((error) => {
                    console.error("Error in getBotContent:", error);
                    sendResponse({ success: false, error: error.message }); // Send error response if an exception occurs
                });
        }
        else if (request.action === "updateBot") {
            // Handle request to update bot content
            let { origin, fileID, authToken, logStructure } = request;
            getBotContent(origin, fileID, authToken)
                .then((response) => {
                    if (response && response.success) {
                        let updatedBotContent = updateLogMessages(
                            response.botContent,
                            logStructure
                        ); // Update log messages with line numbers
                        return putBotJSONContent(
                            origin,
                            fileID,
                            updatedBotContent,
                            authToken
                        ); // Send updated content to the server
                    } else {
                        throw new Error("Failed to fetch bot content");
                    }
                })
                .then((updateResponse) => {
                    if (updateResponse.success) {
                        sendResponse({ success: true }); // Send success response if update is successful
                    } else {
                        throw new Error("Failed to update bot content");
                    }
                })
                .catch((error) => {
                    console.error("Error in updateBot:", error);
                    sendResponse({ success: false, error: error.message }); // Send error response if an exception occurs
                });
        }
        else if (request.action === "pastingBotContent") {
            // Handle request to paste bot content
            let { origin, fileID, authToken, copiedInput } = request;

            // Call the putBotJSONContentPaste function and handle the response
            putBotJSONContentPaste(origin, fileID, copiedInput, authToken)
                .then((pasteResponse) => {
                    if (pasteResponse.success) {
                        sendResponse({ success: true }); // Send success response if paste is successful
                    } else {
                        sendResponse({ success: false, error: pasteResponse.error }); // Send error response if paste fails
                    }
                })
                .catch((error) => {
                    console.error("Error in pastingBotContent:", error);
                    sendResponse({ success: false, error: error.message }); // Send error response if an exception occurs
                });
        } else if (request.action === "silentSaveBot") {
            let { origin, fileID, authToken, payload } = request;

            silentSaveBot(origin, fileID, payload, authToken)
                .then((saveResponse) => {
                    if (saveResponse.success) {
                        sendResponse({ success: true, result: saveResponse });
                    } else {
                        sendResponse({ success: false, error: saveResponse.error || "Silent save failed" });
                    }
                })
                .catch((error) => {
                    console.error("Error in silentSaveBot:", error);
                    sendResponse({ success: false, error: error.message });
                });
        } else if (request.action === "getFolderExportPreview") {
            let { origin, folderID, authToken } = request;

            getFolderExportPreview(origin, folderID, authToken)
                .then((previewResponse) => {
                    sendResponse(previewResponse);
                })
                .catch((error) => {
                    console.error("Error in getFolderExportPreview:", error);
                    sendResponse({ success: false, error: error.message });
                });
        } else if (request.action === "getFolderBotExportBundle") {
            let { origin, folderID, authToken } = request;

            getFolderBotExportBundle(origin, folderID, authToken)
                .then((bundleResponse) => {
                    sendResponse(bundleResponse);
                })
                .catch((error) => {
                    console.error("Error in getFolderBotExportBundle:", error);
                    sendResponse({ success: false, error: error.message });
                });
        } else if (request.action === "createRepositoryFolder") {
            let { origin, parentFolderID, folderName, authToken } = request;

            createFolder(origin, parentFolderID, folderName, authToken)
                .then((folderResponse) => {
                    sendResponse(folderResponse);
                })
                .catch((error) => {
                    console.error("Error in createRepositoryFolder:", error);
                    sendResponse({ success: false, error: error.message });
                });
        } else if (request.action === "createRepositoryAsset") {
            let { origin, parentFolderID, asset, authToken } = request;

            createRepositoryAsset(origin, parentFolderID, asset, authToken)
                .then((assetResponse) => {
                    sendResponse(assetResponse);
                })
                .catch((error) => {
                    console.error("Error in createRepositoryAsset:", error);
                    sendResponse({ success: false, error: error.message });
                });
        } else if (request.action === "putRepositoryAssetContent") {
            let { origin, fileID, assetType, content, authToken } = request;

            putRepositoryAssetContent(origin, fileID, assetType, content, authToken)
                .then((contentResponse) => {
                    sendResponse(contentResponse);
                })
                .catch((error) => {
                    console.error("Error in putRepositoryAssetContent:", error);
                    sendResponse({ success: false, error: error.message });
                });
        } else {
            // Handle unknown action
            sendResponse({ success: false, error: "Unknown action" });
        }

        return true; // Indicates that the response will be sent asynchronously
    });
})();
