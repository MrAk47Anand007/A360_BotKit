# Bulk package updates

Open an authenticated private Control Room folder and choose **Version Update** in BotKit.

After updating the unpacked extension's source, reload **A360 BotKit** on the browser's extensions page (`chrome://extensions` or `edge://extensions`) and refresh the Control Room tab. Otherwise a newly opened popup can still send requests to an older background worker, producing **Unknown action**. The popup now explains these reload steps when that response occurs.

1. **Scan Current Folder** reads Task Bots recursively, including subfolders. Forms and processes are excluded. Bots that cannot be read or edited are shown with a reason.
2. Select bots, or use **Select all editable bots**. Search filters displayed names and paths; selection is retained when filtering.
3. Choose a package used by the selected bots. The usage list includes all scanned bots using it and marks selected bots. Versions come from the connected Control Room, using their full `packageVersion` strings. Only enabled/default versions available to bots are offered.
4. Choose a target version and **Preview Changes**. Review the bots changing, those already at the version, and those not using the package.
5. **Update Package Versions** starts a background batch. Reopening the popup and selecting Version Update shows the latest progress. **Download Results** exports the completed report.

## Save behavior

Each bot is fetched again immediately before writing. BotKit changes only the matching `packages[].version` in a cloned full payload. All other JSON fields and package settings are retained; existing dependencies are not rewritten. Missing packages are never added.

BotKit skips locked bots, bots with unsaved editor changes, bots without edit permission, bots without a readable change timestamp, and package versions changed since the scan. It also compares metadata timestamps before writing to detect changes during the read. This is a best-effort check: the observed API does not expose a verified atomic compare-and-swap contract, so avoid editing affected bots concurrently.

The save keeps the bot's current `hasErrors` flag. It verifies the stored package version after each accepted write. Network loss during a save or a verification mismatch is reported as **Needs verification**, rather than claiming success. Re-scan before retrying. Results are per bot; a failure does not roll back successful updates.

The job retains progress in Chrome session storage, without tokens or full bot payloads. Closing the popup does not cancel it. If the service worker is interrupted, the report is marked interrupted and writes are not automatically resumed. A complete browser restart clears session storage. Package compatibility and bot execution still need checking in Control Room after version changes.

## Observed API contracts

- Folder metadata: `GET /v2/repository/folders/{id}`.
- Paginated folder contents: `POST /v2/repository/folders/{id}/list`. Task Bots use `application/vnd.aa.taskbot`; subfolders use `application/vnd.aa.directory`.
- Bot metadata: `GET /v2/repository/files/{id}`. Used for edit permission, locks, unsaved edits, error status, and modification timestamps.
- Bot content: `GET /v2/repository/files/{id}/content`.
- Package catalog: `POST /v3/packages/package/list`, with a `filterRequest` and `includeDownloadUrls: false`. Internal `name` and display `label` can differ. The updater derives internal names from bot declarations, so it does not need to load the full catalog.
- Published package versions: `POST /v2/packages/package/version/list`, with `filter: {operator: "eq", field: "name", value: packageName}`, a page offset/length, and sort by label. `page.totalFilter` counts matching versions; `page.total` can count versions across all packages.
- Version values are `packageVersion`, not the catalog object's `version` field. Statuses `DEFAULT` and `ENABLED` are usable; recommended Bot Agent and Control Room versions are displayed.
- Save: `PUT /v2/repository/files/{id}/content?hasErrors={existingFlag}`, content type `application/vnd.aa.taskbot`, full bot JSON.
- Requests use the current Control Room session's `X-Authorization` header. Expired sessions are reported; writes are not retried automatically.

## Validation

Run `npm test` for package transformations, folder discovery, pagination, stale/locked/denied bot handling, uncertain saves, persisted-version verification, and background result checkpoints.

Run `node tests/serve_popup.mjs` and open `http://127.0.0.1:8766/popup-harness` for a disposable browser fixture. It uses the real popup and background code against three fake bots: Bot A and nested Bot C use Recorder; Bot B does not. The fixture performs no live Control Room requests. The hidden `fixtureChecks` element reports affected IDs and preservation checks for browser validation.
