import { calculateTotalLines, updateLogMessages, countLinesAccurately,  getBotContent, putBotJSONContent, putBotJSONContentPaste } from '../background/control_room.js';

/**
 * Backgound worker which will listener different actions/messages from extension.
 * Returns response based on action got in message.
 */
(async function () {
    // Event listener for messages from other parts of the extension
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        } else {
            // Handle unknown action
            sendResponse({ success: false, error: "Unknown action" });
        }

        return true; // Indicates that the response will be sent asynchronously
    });
})();
