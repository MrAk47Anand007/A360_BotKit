# Release notes

## 3.2 — October 7, 2026

- Added Version Update: recursively scan folder Task Bots, select bots, see package usage/current versions, select an enabled target version, and preview changes.
- Bulk saves change only the matching package version. Bots without the package remain unchanged; locks, permissions, unsaved edits, stale package versions, and missing/change timestamps are checked before writes.
- Background jobs retain per-bot progress and offer downloadable results. Interrupted jobs require a fresh scan; uncertain saves are marked for verification.
- Added clear extension-reload instructions when a stale background worker responds with “Unknown action.”
- Documented folder export/import and updated privacy disclosures for repository data, downloads, scripting, and session reports.
- Removed Google Fonts requests from the popup; it now uses installed system fonts.
- Added release validation and a repeatable runtime-only upload ZIP build.

Automated tests and fixture browser validation cover the update flow. Live extension validation against Control Room remains required before submitting this release.
