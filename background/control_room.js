/**
 * Function to fetch bot content from the server
 * @param {*} origin string - origin is control room URL
 * @param {*} fileID string - fileID is the bot ID which extracted from Control Room Bot URL
 * @param {*} authToken string - authToken for authorization of control room API's
 * @returns object - Return the bot content if successful else return failure if an error occurs
 */
export async function getBotContent(origin, fileID, authToken) {
    // Define the endpoint URI for fetching and updating bot content
    const botContentURI = "/v2/repository/files/<fileID>/content";
    // Construct the full URL for the API request
    let botContentURL = origin + botContentURI.replace("<fileID>", fileID);

    // Set up headers including content type and authorization token
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("X-Authorization", authToken);

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
    myHeaders.append("X-Authorization", authToken);

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
        let json = await response.json(); // Parse the JSON response
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
    myHeaders.append("X-Authorization", authToken.slice(1, -1));

    // Define request options for a PUT request with formatted JSON body
    let requestOptions = {
        method: "PUT",
        headers: myHeaders,
        body: formattedBotJSONContent, // Use the formatted JSON data
    };
    try {
        // Perform the API request
        let response = await fetch(botContentURL, requestOptions);
        let json = await response.json(); // Parse the JSON response
        if (!response.ok) throw new Error("Fetch failed"); // Check if the response is successful
        return { success: true, json }; // Return the updated bot content if successful
    } catch (error) {
        console.error(error); // Log any errors that occur
        return { success: false }; // Return failure if an error occurs
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