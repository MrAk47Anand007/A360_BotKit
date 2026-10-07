/**
 * Function to fetch bot content from the server
 * @param {*} origin string - origin is control room URL
 * @param {*} fileID string - fileID is the bot ID which extracted from Control Room Bot URL
 * @param {*} authToken string - authToken for authorization of control room API's
 * @returns object - Return the bot content if successful else return failure if an error occurs
 */
function normalizeAuthToken(authToken) {
    if (typeof authToken !== 'string') {
        return '';
    }

    return authToken.startsWith('"') && authToken.endsWith('"')
        ? authToken.slice(1, -1)
        : authToken;
}

async function parseResponseBody(response) {
    const text = await response.text();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        return text;
    }
}

export async function getBotContent(origin, fileID, authToken) {
    // Define the endpoint URI for fetching and updating bot content
    const botContentURI = "/v2/repository/files/<fileID>/content";
    // Construct the full URL for the API request
    let botContentURL = origin + botContentURI.replace("<fileID>", fileID);

    // Set up headers including content type and authorization token
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("X-Authorization", normalizeAuthToken(authToken));

    // Define request options for a GET request
    let requestOptions = {
        method: "GET",
        headers: myHeaders,
    };

    try {
        // Perform the API request
        let response = await fetch(botContentURL, requestOptions);
        if (!response.ok) throw new Error("Fetch failed"); // Check if the response is successful
        let json = await response.json(); // Parse the JSON response
        return { success: true, botContent: json }; // Return the bot content if successful
    } catch (error) {
        console.error(error); // Log any errors that occur
        return { success: false }; // Return failure if an error occurs
    }
}

/**
 * Function to update bot content on the server
 * @param {*} origin string - origin is control room URL
 * @param {*} fileID string - fileID is the bot ID which extracted from Control Room Bot URL
 * @param {*} botJSONContent JSON - It is content of bot extracted using control room URL.
 * @param {*} authToken string - authToken for authorization of control room API's
 * @returns object - Return the updated bot content if successful else return failure if an error occurs
 */
export async function putBotJSONContent(
    origin,
    fileID,
    botJSONContent,
    authToken
) {
    // Define the endpoint URI for fetching and updating bot content
    const botContentURI = "/v2/repository/files/<fileID>/content";
    // Construct the full URL for the API request
    let botContentURL = origin + botContentURI.replace("<fileID>", fileID);

    // Set up headers including content type and authorization token
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("X-Authorization", normalizeAuthToken(authToken));

    // Define request options for a PUT request with JSON body
    let requestOptions = {
        method: "PUT",
        headers: myHeaders,
        body: JSON.stringify(botJSONContent), // Convert the bot content to JSON
    };

    try {
        // Perform the API request
        let response = await fetch(botContentURL, requestOptions);
        if (!response.ok) throw new Error("Fetch failed"); // Check if the response is successful
        let json = await parseResponseBody(response); // Parse the JSON response
        return { success: true, json }; // Return the updated bot content if successful
    } catch (error) {
        console.error(error); // Log any errors that occur
        return { success: false }; // Return failure if an error occurs
    }
}

/**
 * Function to update bot content with pasted JSON data
 * @param {*} origin string - origin is control room URL
 * @param {*} fileID string - fileID is the bot ID which extracted from Control Room Bot URL
 * @param {*} botJSONContent JSON - It is content of bot extracted using control room URL.
 * @param {*} authToken string - authToken for authorization of control room API's
 * @returns object - Return the updated bot content if successful else return failure if an error occurs
 */
export async function putBotJSONContentPaste(
    origin,
    fileID,
    botJSONContent,
    authToken
) {
    // Define the endpoint URI for fetching and updating bot content
    const botContentURI = "/v2/repository/files/<fileID>/content";
    const botContentURL = origin + botContentURI.replace("<fileID>", fileID);

    // Parse the pasted JSON string into an object
    let botJSONContentVal;
    try {
        botJSONContentVal = JSON.parse(botJSONContent); // Attempt to parse the JSON
    } catch (error) {
        console.error("Invalid JSON string:", error); // Log error if JSON is invalid
        return { success: false, error: "Invalid JSON string" }; // Return failure with error message
    }

    let formattedBotJSONContent = JSON.stringify(botJSONContentVal, null, 2); // Format the JSON for readability


    // Set up headers including content type and cleaned authorization token
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("X-Authorization", normalizeAuthToken(authToken));

    // Define request options for a PUT request with formatted JSON body
    let requestOptions = {
        method: "PUT",
        headers: myHeaders,
        body: formattedBotJSONContent, // Use the formatted JSON data
    };
    try {
        // Perform the API request
        let response = await fetch(botContentURL, requestOptions);
        let json = await parseResponseBody(response); // Parse the JSON response
        if (!response.ok) throw new Error("Fetch failed"); // Check if the response is successful
        return { success: true, json }; // Return the updated bot content if successful
    } catch (error) {
        console.error(error); // Log any errors that occur
        return { success: false }; // Return failure if an error occurs
    }
}

/**
 * Save the final bot content payload without using the visible A360 save button.
 * @param {*} origin string - origin is control room URL
 * @param {*} fileID string - fileID is the bot ID
 * @param {*} botJSONContent object - final content payload returned by A360 editor
 * @param {*} authToken string - auth token for the API
 * @param {*} hasErrors boolean - whether the editor payload contains validation errors
 * @returns object - save result
 */
export async function putBotJSONContentSilent(
    origin,
    fileID,
    botJSONContent,
    authToken,
    hasErrors = false
) {
    const botContentURI = "/v2/repository/files/<fileID>/content?hasErrors=<hasErrors>";
    const botContentURL = origin + botContentURI
        .replace("<fileID>", fileID)
        .replace("<hasErrors>", encodeURIComponent(Boolean(hasErrors)));

    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/vnd.aa.taskbot");
    myHeaders.append("Accept", "*/*");
    myHeaders.append("X-Authorization", normalizeAuthToken(authToken));

    const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        body: JSON.stringify(botJSONContent),
    };

    try {
        const response = await fetch(botContentURL, requestOptions);
        const json = await parseResponseBody(response);
        if (!response.ok) {
            throw new Error("Silent content save failed");
        }
        return { success: true, json };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

/**
 * Save the dependency payload required by A360 after content save.
 * @param {*} origin string - origin is control room URL
 * @param {*} fileID string - fileID is the bot ID
 * @param {*} dependencies array - dependency list returned by A360 editor
 * @param {*} authToken string - auth token for the API
 * @returns object - save result
 */
export async function putBotDependencies(
    origin,
    fileID,
    dependencies,
    authToken
) {
    const dependenciesURI = "/v2/repository/files/<fileID>/dependencies";
    const dependenciesURL = origin + dependenciesURI.replace("<fileID>", fileID);

    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "application/json");
    myHeaders.append("X-Authorization", normalizeAuthToken(authToken));

    const dependencyPayload = Array.isArray(dependencies)
        ? { childFileIds: dependencies }
        : dependencies && typeof dependencies === 'object'
            ? dependencies
            : { childFileIds: [] };

    const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        body: JSON.stringify(dependencyPayload),
    };

    try {
        const response = await fetch(dependenciesURL, requestOptions);
        const json = await parseResponseBody(response);
        if (!response.ok) {
            throw new Error("Silent dependency save failed");
        }
        return { success: true, json };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

/**
 * Silent save pipeline that mirrors A360's content + dependencies save sequence.
 * @param {*} origin string - control room origin
 * @param {*} fileID string - bot file ID
 * @param {*} payload object - result of TaskbotEditPage.getContent(formValues)
 * @param {*} authToken string - auth token for the API
 * @returns object - save result
 */
export async function silentSaveBot(origin, fileID, payload, authToken) {
    if (!payload || typeof payload !== 'object') {
        return { success: false, error: 'Missing silent save payload' };
    }

    const contentResponse = await putBotJSONContentSilent(
        origin,
        fileID,
        payload.content,
        authToken,
        payload.hasErrors
    );
    if (!contentResponse.success) {
        return contentResponse;
    }

    const dependenciesResponse = await putBotDependencies(
        origin,
        fileID,
        payload.dependencies,
        authToken
    );
    if (!dependenciesResponse.success) {
        return dependenciesResponse;
    }

    return {
        success: true,
        content: contentResponse.json,
        dependencies: dependenciesResponse.json,
    };
}

export async function getFolderDetails(origin, folderID, authToken) {
    const folderUrl = `${origin}/v2/repository/folders/${folderID}`;
    const headers = new Headers();
    headers.append("Accept", "application/json");
    headers.append("X-Authorization", normalizeAuthToken(authToken));

    try {
        const response = await fetch(folderUrl, {
            method: "GET",
            headers,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch folder details");
        }

        const folder = await response.json();
        return { success: true, folder };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

const EXPORTABLE_ASSET_TYPES = {
    "application/vnd.aa.taskbot": {
        label: "Task Bot",
        fileSuffix: "taskbot.json",
        putContentType: "application/json",
    },
    "application/vnd.aa.form": {
        label: "Form",
        fileSuffix: "form.json",
        putContentType: "application/vnd.aa.form",
    },
    "application/vnd.aa.workflow": {
        label: "Process",
        fileSuffix: "workflow.json",
        putContentType: "application/vnd.aa.workflow",
    },
};

function getImportAssetTypeConfig(assetType) {
    return EXPORTABLE_ASSET_TYPES[assetType] || null;
}

export async function getFolderChildren(origin, folderID, authToken) {
    const childrenUrl = `${origin}/v2/repository/folders/${folderID}/children`;
    const headers = new Headers();
    headers.append("Accept", "application/json");
    headers.append("X-Authorization", normalizeAuthToken(authToken));

    try {
        const response = await fetch(childrenUrl, {
            method: "GET",
            headers,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch child folders");
        }

        const json = await response.json();
        const children = Array.isArray(json?.list) ? json.list : Array.isArray(json) ? json : [];
        return { success: true, children };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

export async function listFolderItems(origin, folderID, authToken) {
    const listUrl = `${origin}/v2/repository/folders/${folderID}/list`;
    const headers = new Headers();
    headers.append("Accept", "application/json");
    headers.append("Content-Type", "application/json");
    headers.append("X-Authorization", normalizeAuthToken(authToken));

    const collected = [];
    let offset = 0;
    const length = 100;
    const modernSort = [
        { field: "directory", direction: "asc" },
        { field: "typeLabel", direction: "asc" },
        { field: "name", direction: "asc" }
    ];
    const legacySort = [
        { field: "directory", direction: "asc" },
        { field: "type", direction: "asc" },
        { field: "name", direction: "asc" }
    ];

    async function fetchListPage(sort) {
        const response = await fetch(listUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
                fields: [],
                filter: null,
                sort,
                page: {
                    offset,
                    length,
                }
            }),
        });

        const json = await parseResponseBody(response);
        return { response, json };
    }

    try {
        while (true) {
            let { response, json } = await fetchListPage(modernSort);
            if (!response.ok) {
                const legacyResult = await fetchListPage(legacySort);
                response = legacyResult.response;
                json = legacyResult.json;
            }

            if (!response.ok) {
                throw new Error(
                    json?.message ||
                    json?.error ||
                    "Failed to list folder items"
                );
            }

            const items = Array.isArray(json?.list) ? json.list : [];
            collected.push(...items);
            if (items.length < length) {
                break;
            }
            offset += length;
        }

        return { success: true, items: collected };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

async function collectExportableAssetsRecursively(origin, authToken, folder, relativeFolders = []) {
    const listResponse = await listFolderItems(origin, folder.id, authToken);
    if (!listResponse.success) {
        throw new Error(listResponse.error || `Failed to list folder ${folder.id}`);
    }

    const folderChildrenResponse = await getFolderChildren(origin, folder.id, authToken);
    if (!folderChildrenResponse.success) {
        throw new Error(folderChildrenResponse.error || `Failed to get children for ${folder.id}`);
    }

    const assetEntries = listResponse.items
        .filter((item) => EXPORTABLE_ASSET_TYPES[item?.type])
        .map((item) => ({
            id: item.id,
            folderId: folder.id,
            name: item.name || `asset-${item.id}`,
            relativeFolders,
            exportPath: [
                ...relativeFolders,
                `${item.name || item.id}.${EXPORTABLE_ASSET_TYPES[item.type].fileSuffix}`
            ],
            metadata: {
                size: item.size || "",
                lastModified: item.lastModified || "",
                type: item.type,
                typeLabel: item.typeLabel || EXPORTABLE_ASSET_TYPES[item.type].label,
                botStatus: item.botStatus || "",
                platform: item.latestTargetPlatform || item.platform || "",
            }
        }));

    let assets = [...assetEntries];
    let foldersVisited = 1;
    let childFolderCount = 0;

    for (const childFolder of folderChildrenResponse.children) {
        if (childFolder?.type !== "application/vnd.aa.directory") {
            continue;
        }

        childFolderCount += 1;
        const childResult = await collectExportableAssetsRecursively(
            origin,
            authToken,
            childFolder,
            [...relativeFolders, childFolder.name || childFolder.id]
        );
        foldersVisited += childResult.foldersVisited;
        childFolderCount += childResult.childFolderCount;
        assets = assets.concat(childResult.assets);
    }

    return {
        foldersVisited,
        childFolderCount,
        assets,
    };
}

async function withConcurrency(items, limit, iteratee) {
    const results = [];
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const currentIndex = index;
            index += 1;
            results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length || 1) }, () => worker());
    await Promise.all(workers);
    return results;
}

export async function getFolderExportPreview(origin, folderID, authToken) {
    const folderResponse = await getFolderDetails(origin, folderID, authToken);
    if (!folderResponse.success) {
        return folderResponse;
    }

    try {
        const tree = await collectExportableAssetsRecursively(origin, authToken, folderResponse.folder, []);
        const byType = Object.keys(EXPORTABLE_ASSET_TYPES).reduce((result, type) => {
            result[type] = 0;
            return result;
        }, {});
        tree.assets.forEach((asset) => {
            byType[asset.metadata.type] = (byType[asset.metadata.type] || 0) + 1;
        });
        return {
            success: true,
            folder: {
                id: folderResponse.folder.id,
                name: folderResponse.folder.name || `folder-${folderID}`,
                path: folderResponse.folder.path || "",
            },
            totals: {
                assets: tree.assets.length,
                taskBots: byType["application/vnd.aa.taskbot"] || 0,
                forms: byType["application/vnd.aa.form"] || 0,
                workflows: byType["application/vnd.aa.workflow"] || 0,
                foldersVisited: tree.foldersVisited,
                childFolders: tree.childFolderCount,
            }
        };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

export async function getFolderBotExportBundle(origin, folderID, authToken) {
    const folderResponse = await getFolderDetails(origin, folderID, authToken);
    if (!folderResponse.success) {
        return folderResponse;
    }

    try {
        const tree = await collectExportableAssetsRecursively(origin, authToken, folderResponse.folder, []);
        const failures = [];

        const exports = await withConcurrency(tree.assets, 3, async (asset) => {
            const contentResponse = await getBotContent(origin, asset.id, authToken);
            if (!contentResponse.success) {
                failures.push({
                    id: asset.id,
                    name: asset.name,
                    error: "Failed to fetch asset content",
                });
                return null;
            }

            return {
                ...asset,
                content: contentResponse.botContent,
            };
        });

        const items = exports.filter(Boolean);
        const byType = Object.keys(EXPORTABLE_ASSET_TYPES).reduce((result, type) => {
            result[type] = 0;
            return result;
        }, {});
        items.forEach((item) => {
            byType[item.metadata.type] = (byType[item.metadata.type] || 0) + 1;
        });
        return {
            success: true,
            bundle: {
                exportedAt: new Date().toISOString(),
                folder: {
                    id: folderResponse.folder.id,
                    name: folderResponse.folder.name || `folder-${folderID}`,
                    path: folderResponse.folder.path || "",
                },
                totals: {
                    assetsDiscovered: tree.assets.length,
                    assetsExported: items.length,
                    failedAssets: failures.length,
                    taskBots: byType["application/vnd.aa.taskbot"] || 0,
                    forms: byType["application/vnd.aa.form"] || 0,
                    workflows: byType["application/vnd.aa.workflow"] || 0,
                    foldersVisited: tree.foldersVisited,
                    childFolders: tree.childFolderCount,
                },
                items,
                failures,
            }
        };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

export async function createFolder(origin, parentFolderID, folderName, authToken) {
    const createUrl = `${origin}/v2/repository/folders/${parentFolderID}`;
    const headers = new Headers();
    headers.append("Accept", "application/json");
    headers.append("Content-Type", "application/json");
    headers.append("X-Authorization", normalizeAuthToken(authToken));

    try {
        const response = await fetch(createUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
                folderName,
            }),
        });
        const json = await parseResponseBody(response);
        if (!response.ok) {
            const fallbackChildrenResponse = await getFolderChildren(origin, parentFolderID, authToken);
            if (fallbackChildrenResponse.success) {
                const matchingFolder = fallbackChildrenResponse.children.find((child) =>
                    child?.type === "application/vnd.aa.directory" &&
                    child?.name === folderName
                );
                if (matchingFolder) {
                    return { success: true, folder: matchingFolder, reused: true };
                }
            }

            throw new Error(
                json?.message ||
                json?.error ||
                `Failed to create folder ${folderName}`
            );
        }

        return { success: true, folder: json };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

export async function createRepositoryAsset(origin, parentFolderID, asset, authToken) {
    const assetType = asset?.type;
    const typeConfig = getImportAssetTypeConfig(assetType);
    if (!typeConfig) {
        return { success: false, error: `Unsupported asset type: ${assetType || "unknown"}` };
    }

    const createUrl = `${origin}/v2/repository/files`;
    const headers = new Headers();
    headers.append("Accept", "application/json");
    headers.append("Content-Type", "application/json");
    headers.append("X-Authorization", normalizeAuthToken(authToken));

    const payload = {
        name: asset?.name || "Imported Asset",
        contentType: assetType,
        description: asset?.description || "",
        parentFolderId: parentFolderID,
    };

    if (assetType === "application/vnd.aa.taskbot") {
        const platform = String(asset?.platform || "WINDOWS").toUpperCase();
        payload.tags = [{
            namespace: "INTENDED_TARGET",
            value: platform,
        }];
    }

    try {
        const response = await fetch(createUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });
        const json = await parseResponseBody(response);
        if (!response.ok) {
            throw new Error(
                json?.message ||
                json?.error ||
                `Failed to create ${typeConfig.label.toLowerCase()} ${payload.name}`
            );
        }

        return { success: true, asset: json };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

export async function putRepositoryAssetContent(origin, fileID, assetType, content, authToken) {
    const typeConfig = getImportAssetTypeConfig(assetType);
    if (!typeConfig) {
        return { success: false, error: `Unsupported asset type: ${assetType || "unknown"}` };
    }

    const contentUrl = `${origin}/v2/repository/files/${fileID}/content?hasErrors=false`;
    const headers = new Headers();
    headers.append("Accept", "application/json");
    headers.append("Content-Type", typeConfig.putContentType);
    headers.append("X-Authorization", normalizeAuthToken(authToken));

    try {
        const response = await fetch(contentUrl, {
            method: "PUT",
            headers,
            body: JSON.stringify(content),
        });
        const json = await parseResponseBody(response);
        if (!response.ok) {
            throw new Error(
                json?.message ||
                json?.error ||
                `Failed to import content for file ${fileID}`
            );
        }

        return { success: true, result: json };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

/**
 * Function to count lines in the bot content
 * @param {*} node object - Node is the object of content which extracted from bot
 * @returns int - Returns the line count of given node.
 */
export function countLinesAccurately(node) {
    let lineCount = 0;

    // Each node with a commandName attribute counts as a line
    if (node.commandName) {
        lineCount += 1;
    }

    // Recursively count lines in children nodes
    if (Array.isArray(node.children)) {
        for (let child of node.children) {
            lineCount += countLinesAccurately(child);
        }
    }

    // Recursively count lines in branches
    if (Array.isArray(node.branches)) {
        for (let branch of node.branches) {
            lineCount += countLinesAccurately(branch); // Treat each branch as a node
        }
    }

    return lineCount;
}

/**
 * Function to calculate the total number of lines in the bot content
 * @param {*} botContent object - bot content is the object of content which extracted using control room URL using file ID.
 * @returns int - Returns total lines count in bot content.
 */
export function calculateTotalLines(botContent) {
    let totalLines = 0;
    if (Array.isArray(botContent.nodes)) {
        for (let node of botContent.nodes) {
            totalLines += countLinesAccurately(node);
        }
    }
    return totalLines;
}

/**
 * Function to update the log message in given bot
 * @param {*} botContent object - Takes bot content as input and update bot content based on new line numbers.
 * @param {*} logStructure string - User's placeholder that needs to be replaced with line number
 * @returns object - Returns object of updated bot content.
 */
export function updateLogMessages(botContent, logStructure) {
    let totalLineNumber = 0;

    // --- Helpers to read/write log content correctly ---
    function getLogContent(attribute) {
        if (!attribute || !attribute.value) return { key: null, content: null };

        const v = attribute.value;

        // Common A360 fields
        if (typeof v.expression === 'string') {
            return { key: 'expression', content: v.expression };
        }
        if (typeof v.literal === 'string') {
            return { key: 'literal', content: v.literal };
        }
        if (typeof v.value === 'string') {
            return { key: 'value', content: v.value };
        }
        // Your case: { type: 'STRING', string: 'anand [linenumber]' }
        if (typeof v.string === 'string') {
            return { key: 'string', content: v.string };
        }

        // Fallback
        if (typeof attribute.value === 'string') {
            return { key: null, content: attribute.value };
        }

        return { key: null, content: null };
    }

    function setLogContent(attribute, key, newContent) {
        if (!attribute) return;

        if (key && attribute.value) {
            attribute.value[key] = newContent;   // expression / literal / value / string
        } else if (!key && typeof attribute.value === 'string') {
            attribute.value = newContent;
        }
    }

    // --- Core replacement logic ---
    function applyPlaceholderReplacement(currentLogContent, totalLineNumber, logStructure) {
        // If user provided a placeholder → use that
        if (logStructure && logStructure.trim()) {
            const rawPlaceholder = logStructure.trim();

            // Escape regex meta chars so placeholder is treated literally
            let escaped = rawPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Allow flexible whitespace inside the placeholder
            escaped = escaped.replace(/\s+/g, '\\s*');

            const placeholderRegex = new RegExp(escaped, 'gi');

            if (placeholderRegex.test(currentLogContent)) {
                const trimmedPlaceholder = rawPlaceholder.trim();
                let replacement = String(totalLineNumber);

                // Generic wrapper detection:
                // if first + last chars are non-alphanumeric, keep them
                if (trimmedPlaceholder.length >= 3) {
                    const firstChar = trimmedPlaceholder[0];
                    const lastChar  = trimmedPlaceholder[trimmedPlaceholder.length - 1];

                    const isWrapperChar = ch => /[^a-zA-Z0-9]/.test(ch); // any non-alphanumeric

                    if (isWrapperChar(firstChar) && isWrapperChar(lastChar)) {
                        const inner = trimmedPlaceholder.slice(1, -1);

                        // If inner has spaces, format like "| 3 |"
                        if (/\s/.test(inner)) {
                            replacement = `${firstChar} ${totalLineNumber} ${lastChar}`;
                        } else {
                            // "[3]", "(3)", "#3#", "<3>"
                            replacement = `${firstChar}${totalLineNumber}${lastChar}`;
                        }
                    }
                }

                return currentLogContent.replace(
                    placeholderRegex,
                    replacement
                );
            } else {
                console.log('No match found for placeholder in log:', {
                    currentLogContent,
                    rawPlaceholder,
                    regex: placeholderRegex.toString(),
                    line: totalLineNumber
                });
                return currentLogContent;
            }
        }

        // No placeholder → auto-detect existing patterns (your original behavior)
        const regex = /\|\s*\d+\s*\|/;
        const match = currentLogContent.match(regex);

        if (match) {
            return currentLogContent.replace(
                regex,
                `| ${totalLineNumber} |`
            );
        } else {
            return currentLogContent.replace(
                /-\d+-/,
                `-${totalLineNumber}-`
            );
        }
    }

    function processNode(node) {
        let lineCount = 0;

        if (node.commandName) {
            lineCount += 1;
            totalLineNumber += 1;

            if (node.commandName === "logToFile" && Array.isArray(node.attributes)) {
                node.attributes.forEach((attribute) => {
                    if (attribute.name === "logContent") {
                        const { key, content } = getLogContent(attribute);

                        if (!content || typeof content !== 'string') {
                            console.warn(
                                'Skipping log with invalid content at line',
                                totalLineNumber,
                                'attribute:',
                                attribute
                            );
                            return;
                        }

                        const updatedContent = applyPlaceholderReplacement(
                            content,
                            totalLineNumber,
                            logStructure
                        );

                        setLogContent(attribute, key, updatedContent);
                    }
                });
            }
        }

        if (Array.isArray(node.children)) {
            for (let child of node.children) {
                lineCount += processNode(child);
            }
        }

        if (Array.isArray(node.branches)) {
            for (let branch of node.branches) {
                lineCount += processNode(branch);
            }
        }

        return lineCount;
    }

    if (Array.isArray(botContent.nodes)) {
        for (let node of botContent.nodes) {
            processNode(node);
        }
    }

    return botContent;
}
