console.log("Content By AK loaded")
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getTabDetails") {
        const origin = window.location.origin;
        const fileID = window.location.toString().split("/").slice(-2)[0];
        const url = window.location.href;

        // Use a Promise to handle async localStorage access
        new Promise((resolve) => {
            resolve(localStorage.authToken ? localStorage.authToken.toString() : null);
        }).then(authToken => {
            console.log("Auth Token in content script:", authToken); // Debug log
            sendResponse({ origin, fileID, authToken,url });
        });

        return true; // Indicates that the response will be sent asynchronously
    }
});