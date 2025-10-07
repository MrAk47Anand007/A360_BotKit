// Event listener to ensure the DOM is fully loaded before executing script
document.addEventListener('DOMContentLoaded', () => {

    // Tab switching functionality
    function openTab(evt, tabName) {
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    }

    // Add event listeners for tab buttons
    document.getElementById("logActionTab").addEventListener("click", function(event) {
        openTab(event, "LogAction");
    });
    document.getElementById("copyBotActionTab").addEventListener("click", function(event) {
        openTab(event, "CopyBotAction");
    });

    // Open the default tab (Log Action) on load
    document.getElementById("logActionTab").click();


    // Get references of extensions DOM elements
    const lineCountSpan = document.getElementById('lineCount');
    const logInput = document.getElementById('logInput');
    const copyButton = document.getElementById('copyButton');
    const updateButton = document.getElementById('updateButton');
    const statusMessage = document.getElementById('statusMessage');
    const loader = document.getElementById('loader');
    const popupMessage = document.getElementById('popupMessage');
    const refreshButton = document.getElementById('refreshButton');


    /**
     * Function to check authentication token properly retrieved - if yes then hide refresh button else show refresh button.
     */
    function checkForAuthTokenError() {
        if (statusMessage.textContent === "Error retrieving auth token.") {
            refreshButton.style.display = 'block'; // Show the refresh button
        } else {
            refreshButton.style.display = 'none'; // Hide the refresh button if the error is not present
        }
    }

    // Set up a MutationObserver to watch for changes in the statusMessage element
    const observer = new MutationObserver(checkForAuthTokenError);

    // Start observing the statusMessage element for changes to its text content
    observer.observe(statusMessage, { childList: true, subtree: true });

    // Initial check in case the status message is already set when the page loads
    checkForAuthTokenError();



    // Function to show the loader
    function showLoader() {
        loader.style.display = 'block';
    }

    // Function to hide the loader
    function hideLoader() {
        loader.style.display = 'none';
    }

    // Function to retrieve tab details using Chrome's tabs API
    function getTabDetails() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "getTabDetails" }, (response) => {
                    console.log("Response from content script:", response);
                    resolve(response);
                });
            });
        });
    }

    /**
     * Function to check if the current page is an A360 bot page
     * @param {*} url - string - URL of current chrome tab
     * @returns bool - true or false based on URL provided if it is A360 based URL then true else false
     */
    function isA360BotPage(url) {
        const pattern = /#\/bots\/repository\/private\/.*\/\d+\/edit$/;
        return pattern.test(url);
    }

    /**
     * Asynchronous function to fetch and display the line count
     */
    async function fetchAndDisplayLineCount() {
        console.log("Starting fetchAndDisplayLineCount");
        showLoader();
        try {
            console.log("Fetching tab details");
            const tabDetails = await getTabDetails();
            console.log("Tab details received:", tabDetails);

            if (tabDetails && tabDetails.authToken) {
                console.log("Auth token found in tab details");
                const authToken = tabDetails.authToken.slice(1, -1); // Process auth token
                console.log("Processed auth token:", authToken);

                console.log("Sending message to get bot content");

                // Call getBotContent action using chrome send message which will return promise which will contain bot content.
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        {
                            action: "getBotContent",
                            origin: tabDetails.origin,
                            fileID: tabDetails.fileID,
                            authToken
                        },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else {
                                console.log("Received response from background script:", response);
                                resolve(response);
                            }
                        }
                    );
                });

                hideLoader();
                console.log("Full response object:", response);
                if (response && response.success && response.lineCount !== undefined) {
                    console.log("Updating line count:", response.lineCount);
                    lineCountSpan.textContent = response.lineCount;
                    statusMessage.textContent = `Auth token found. Line count: ${response.lineCount}`;
                    console.log("Bot Content:", response.botContent);
                } else {
                    console.error("Error in response:", response);
                    statusMessage.textContent = "Error fetching bot content.";
                    lineCountSpan.textContent = "N/A";
                }
            } else {
                console.log("No auth token found in tab details");
                hideLoader();
                statusMessage.textContent = "Error retrieving auth token.";
                lineCountSpan.textContent = "N/A";
            }
        } catch (error) {
            console.error("Caught error in fetchAndDisplayLineCount:", error);
            hideLoader();
            statusMessage.textContent = "Error retrieving tab details: " + error.message;
            lineCountSpan.textContent = "N/A";
        }
        console.log("fetchAndDisplayLineCount completed");
    }

    // Asynchronous function to handle the popup message based on tab details
    async function handlePopupMessage() {
        try {
            const tabDetails = await getTabDetails();
            if (tabDetails && tabDetails.url) {
                if (isA360BotPage(tabDetails.url)) {
                    popupMessage.textContent = "Looks Good";
                    fetchAndDisplayLineCount(); // Fetch and display the line count on load
                } else {
                    popupMessage.textContent = "Open A360 Bot Editor.";
                }
            } else {
                popupMessage.textContent = "Error retrieving tab URL.";
            }
        } catch (error) {
            console.error("Error in handlePopupMessage:", error);
            popupMessage.textContent = "Error retrieving tab details.";
        }
    }


    // Event listener for the copy button to copy bot content to the clipboard
    copyButton.addEventListener('click', async () => {
        showLoader();
        try {
            const response = await getTabDetails();
            if (response && response.authToken && isA360BotPage(response.url)) {
                const authToken = response.authToken.slice(1, -1);
                chrome.runtime.sendMessage({ action: "getBotContent", origin: response.origin, fileID: response.fileID, authToken }, (response) => {
                    hideLoader();
                    if (response.success) {
                        navigator.clipboard.writeText(JSON.stringify(response.botContent)).then(() => {
                            statusMessage.textContent = "Bot content copied to clipboard!";
                        }).catch(() => {
                            statusMessage.textContent = "Error copying to clipboard.";
                        }).finally(() => {
                            setTimeout(() => { statusMessage.textContent = ""; }, 2000); // Reset status message after 2 seconds
                        });
                    } else {
                        statusMessage.textContent = "Error fetching bot content.";
                    }
                });
            } else {
                hideLoader();
                statusMessage.textContent = "Error retrieving auth token.";
            }
        } catch (error) {
            hideLoader();
            statusMessage.textContent = "Error retrieving tab details.";
            console.error("Error in copyButton:", error);
        }
    });

    // Add click event listener to refresh the current tab
    refreshButton.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.reload(tabs[0].id); // Refresh the current tab
        });
    });

    // Event listener for the update button to update the bot content
    document.getElementById("patchContent").addEventListener("click", async () => {
        const copiedInput = document.getElementById("contentInput").value;
        showLoader();
        try {
            const response = await getTabDetails();
            if (response && response.authToken && isA360BotPage(response.url)) {
                statusMessage.textContent = "Updating bot...";

                chrome.runtime.sendMessage({
                    action: "pastingBotContent",
                    origin: response.origin,
                    fileID: response.fileID,
                    authToken: response.authToken,
                    copiedInput: copiedInput
                }, (response) => {
                    if (response.success) {
                        hideLoader();
                        statusMessage.textContent = "Bot Updated Refresh Page";
                    } else {
                        hideLoader();
                        statusMessage.textContent = "Bot Not Updated";
                        console.error("Error:", response.error);
                    }
                });
            } else {
                hideLoader();
                statusMessage.textContent = "Error retrieving auth token.";
            }
        } catch (error) {
            hideLoader();
            statusMessage.textContent = "Error retrieving tab details.";
            console.error("Error in updateButton:", error);
        }
    });

    // Event listener for the update button to update the bot content
    updateButton.addEventListener('click', async () => {
        showLoader();
        try {
            const response = await getTabDetails();
            if (response && response.authToken && isA360BotPage(response.url)) {
                const authToken = response.authToken.slice(1, -1);
                statusMessage.textContent = "Updating bot...";
                chrome.runtime.sendMessage({ action: "updateBot", origin: response.origin, fileID: response.fileID, authToken, logStructure: logInput.value }, (response) => {
                    hideLoader();
                    if (response.success) {
                        statusMessage.textContent = "Bot updated successfully!";
                    } else {
                        statusMessage.textContent = "Error updating bot: " + response.error;
                    }
                    setTimeout(() => { statusMessage.textContent = ""; }, 3000); // Clear message after 3 seconds
                });
            } else {
                hideLoader();
                statusMessage.textContent = "Error retrieving auth token.";
            }
        } catch (error) {
            hideLoader();
            statusMessage.textContent = "Error retrieving tab details.";
            console.error("Error in updateButton:", error);
        }
    });
    handlePopupMessage();
});
