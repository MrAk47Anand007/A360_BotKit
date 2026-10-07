# Chrome Web Store release — 3.2

## Upload package

From the repository root on Windows:

```powershell
npm run package
```

Upload `dist/A360-BotKit-3.2.zip` to the **existing** A360 BotKit item (`ieolchhicpekhpfnkbmbhliblcildhfn`) using **Package → Upload New Package**. Do not create a second listing. The ZIP contains the root manifest, background modules, content helpers, popup assets, icons, and MIT license. Tests, fixture servers, semantic indexes, graphs, docs, and Git metadata are excluded.

Version 3.2 is greater than the repository's previous 3.1 version. The current published/draft dashboard version was not accessible during preparation: confirm it is below 3.2 before upload. If it is already 3.2 or higher, increase `manifest.json`, the popup footer, package metadata, release notes, and these instructions before rebuilding.

## Listing text

**Name:** A360 BotKit

**Short description** (also used in the manifest):

> A360 Control Room tools for bot editing, folder export/import, autosave, and bulk package version updates.

**Detailed description:**

```text
A360 BotKit helps Automation Anywhere A360 developers maintain bots inside their own Control Room.

TOOLS
• Update log placeholders with real bot line numbers.
• Copy bot JSON for review or backup, and patch bots using valid JSON.
• Export repository folders and supported assets, and import a selected bundle into a Control Room folder.
• Use optional native autosave or experimental silent autosave.
• Update package versions across selected Task Bots in a folder and its subfolders.

BULK PACKAGE VERSION UPDATE
Open a repository folder, scan its Task Bots, and select the bots you want to maintain. See which bots use each package and their current versions. Choose an enabled package version from your Control Room and preview the affected bots before applying it.

Only the matching package version changes; missing packages are not added. Locked bots, unavailable edit permissions, unsaved editor changes, and detected concurrent changes are reported. Follow each bot's outcome in the progress report and download the results. Check package compatibility and run affected bots in Control Room after updating.

DATA HANDLING
Uses your existing Control Room session. Bot content and save requests go to the same Control Room origin. No developer backend, ads, analytics, or external font requests. Settings stay locally in your browser. The latest package-update report is retained in browser session storage without auth tokens or full bot payloads. Export bundles and reports are downloaded only when requested.

GET STARTED
Open an A360 Control Room editor or repository folder and click the BotKit toolbar icon. Folder tools require an authenticated session and appropriate repository permissions. Silent autosave is experimental and depends on Control Room's editor behavior.

A360 BotKit is independent and is not affiliated with or endorsed by Automation Anywhere.

Support: https://github.com/MrAk47Anand007/A360_BotKit/issues
Privacy: https://mrak47anand007.github.io/A360_BotKit/privacy-policy.html
```

**What's new:** Bulk package version updates with recursive bot discovery, package usage, change previews, per-bot results, and stale/locked-bot checks. Clear reload guidance for outdated background workers. Updated data disclosures and removed external font requests.

## Privacy practices fields

**Single purpose:** Help developers maintain Automation Anywhere A360 bots within their own Control Room, using editing, repository transfer, autosave, and package maintenance tools.

| Permission / access | Justification to paste |
| --- | --- |
| activeTab | Read and interact with the active Control Room tab when the user opens the popup and requests a bot or repository operation. Grants temporary access to that Control Room origin for the requested API operations. |
| storage | Persist autosave settings locally and retain the latest package-update progress/results in session storage while the popup is closed. Job reports exclude auth tokens and full bot JSON. |
| downloads | Save repository export bundles and package-update result reports when the user requests a download. |
| scripting | Inject the packaged content helper into the active Control Room tab when it is missing, including tabs opened before installation. |
| HTTP/HTTPS content-script site access | Control Room instances use customer-specific domains and local development origins, so a fixed tenant hostname cannot cover supported installations. URL checks activate Control Room behavior on supported editor/repository routes. The extension does not collect general browsing history. |

**Remote code:** No. Executable JavaScript is bundled with the extension. Control Room API responses are data, and the packaged page bridge interacts with the existing Control Room editor.

**Data disclosures:** Accurately declare **Authentication information** (the current session token) and **Website content** (bot JSON, repository metadata, and package information). The current Control Room URL/origin is read for the requested feature; assess the dashboard's **Web history** category wording against that access rather than asserting that no URLs are handled. Bot payloads can contain customer-defined confidential or personal fields; review any other categories applicable to your actual workflows. No data is sold or used for advertising, unrelated purposes, or creditworthiness/lending decisions. Local handling and same-origin requests must be consistent with the published privacy policy.

**Privacy policy URL:** `https://mrak47anand007.github.io/A360_BotKit/privacy-policy.html`

The local policy was updated. Publish it through the repository's existing GitHub Pages deployment and verify the public page shows **October 7, 2026** before submission. The ZIP alone does not update the hosted policy.

## Reviewer instructions

The extension requires an Automation Anywhere A360 Control Room account with access to Task Bots and folders. Use a test environment and disposable bots. Do not put production session tokens or credentials in public listing text. Provide a private review account or a demonstration recording through the dashboard if reviewer access requires it.

For Version Update: open a private repository folder containing two Task Bots using the same package at different versions and one bot without that package. Include a nested folder. Open BotKit → Version Update → Scan Current Folder, select bots, choose a package and enabled target version, preview, and update. Confirm only bots using that package changed, inspect the per-bot report, and verify the version in each bot's Control Room editor.

## Remaining checks before submission

- [x] Manifest/popup/release metadata updated to 3.2.
- [x] Local privacy policy and listing copy cover all current features and permissions.
- [x] External Google Fonts request removed.
- [x] Runtime reference and JavaScript syntax validation implemented.
- [x] Automated update, lifecycle, and stale-worker message tests passed during preparation.
- [ ] Load the built package unpacked in Chrome; refresh Control Room and verify the previous “Unknown action” scan issue is gone.
- [ ] Run a disposable live update, then inspect saved bot JSON, reopen the popup, download the report, and execute affected bots with the selected package.
- [ ] Smoke-test Update, Copy/Patch, Export, Import, autosave, and theme switching in the installed release.
- [ ] Publish and verify the hosted privacy policy; confirm the dashboard version is lower than 3.2.
- [ ] Update store screenshots to show the real installed Version Update workflow. Retain existing valid icons/promo art; do not submit fixture screenshots as live Control Room proof.
- [ ] Update listing/privacy fields and reviewer access instructions; upload the ZIP and submit for review.

Preparation does not upload, publish, or submit the extension. Automated tests and fixture checks do not establish live Control Room compatibility or Chrome Web Store approval.

Official guidance: [Update an existing item](https://developer.chrome.com/docs/webstore/update), [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).
