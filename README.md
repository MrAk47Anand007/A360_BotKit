# A360 BotKit

Chrome extension for working with Automation Anywhere A360 bots inside Control Room.

[Chrome Web Store](https://chromewebstore.google.com/detail/ieolchhicpekhpfnkbmbhliblcildhfn)  
[Privacy Policy](privacy-policy.html)  
[Source Code](https://github.com/MrAk47Anand007/A360_BotKit)

## What It Does

A360 BotKit is focused on one job: helping A360 developers work faster inside the bot editor.

It adds a compact popup with tools for:
- updating log placeholders with real line numbers
- copying bot JSON for backup or review
- patching a bot from valid JSON
- autosaving editor changes with either native or silent mode
- exporting and importing repository folders and supported assets
- updating a package version across selected Task Bots in a folder and its subfolders

## Why Teams Use It

- Faster debugging with line numbers in log messages
- Safer bot edits with quick copy and patch workflows
- Optional autosave for long editing sessions
- Clear status feedback directly in the popup and on the page
- Dark mode for daily use

## Main Features

### Version Update

Open a Control Room folder, scan its bots and subfolders, select bots, and choose a package and target version. Preview the affected bots before applying the update. Bots without that package remain unchanged; results show each bot's outcome.

See [bulk package update usage and save safeguards](docs/bulk-package-updates.md).

### Update Bot

Replace a placeholder in log actions with the bot's current line numbers.

Examples:
- `[LINE]` becomes `[42]`
- `| 0 |` becomes `| 42 |`
- `#0#` becomes `#42#`

Leave the field empty to auto-detect common number patterns already present in log text.

### Copy & Patch

- Copy the current bot JSON to your clipboard
- Paste valid bot JSON back into the editor when you need to restore or patch content

This is useful for backup, experiments, and recovery.

### Autosave

Two autosave modes are available in `Settings`:

- `Native Mode`
  Uses A360's regular Save flow. This is the safest option and may show A360's normal save loader.
- `Silent Mode`
  Extracts the current unsaved editor payload and saves it in the background. This feels smoother, but it depends more heavily on A360's internal editor behavior and is marked experimental.

## How To Use

1. Open an A360 bot editor or repository folder page in Control Room.
2. Click the `A360 BotKit` extension icon.
3. Choose one of the tabs:
   - `Update`
   - `Cpy-Pste`
   - `Export`
   - `Import`
   - `Version Update`
   - `Settings`
4. Run the tool you need.

## Permissions And Data Handling

A360 BotKit is designed for customer-hosted Control Room environments, so it must work across different HTTPS domains used by different A360 tenants.

The extension uses:

- `activeTab`
  To interact with the current tab when you use the popup.
- `storage`
  To store autosave preferences in `chrome.storage.local` and the latest package-update report in `chrome.storage.session`.
- `downloads`
  To save requested repository export bundles and package-update reports.
- `scripting`
  To inject the bundled Control Room content helper into the active tab when it is not already loaded.
- extension local storage
  To store the popup theme preference as `botkit-theme`.
- HTTP and HTTPS page access
  To support customer-specific Control Room domains and local development environments, with URL checks for supported editor and repository routes.

The extension handles:
- the current A360 editor URL and file ID
- the A360 auth token already present in your browser session
- bot content returned by your A360 Control Room
- current unsaved editor payloads when autosave is enabled
- folder and bot names, IDs, paths, package versions, edit permissions, and update results
- export bundles and local import files you select

The extension sends this data only to the same A360 Control Room you are already signed in to. It does not send bot data, auth tokens, or analytics to the developer or to unrelated third-party services.

## Privacy Summary

- No ads
- No analytics
- No sale of user data
- No developer-operated backend service
- Data is used only to provide the extension's bot editing features inside A360

Read the full [Privacy Policy](privacy-policy.html).

Downloaded bundles and reports remain on your computer until you delete them. The latest package-update report is kept in browser session storage without auth tokens or full bot JSON. The popup uses system fonts and makes no external font requests.

## Installation

### Chrome Web Store

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/ieolchhicpekhpfnkbmbhliblcildhfn).

### Load Unpacked

```bash
git clone https://github.com/MrAk47Anand007/A360_BotKit.git
cd A360_BotKit
```

Then open `chrome://extensions`, enable Developer mode, and load the project folder as an unpacked extension.

After changing source files, reload BotKit on that page, refresh Control Room, and reopen the popup so the background worker and page helper use the same release.

## Release packaging

Run `npm run package` on Windows to validate the runtime, run tests, and build `dist/A360-BotKit-3.2.zip`. The ZIP includes only extension runtime files and the license, with the manifest at its root.

See [Chrome Web Store release instructions](docs/chrome-web-store-release.md) for listing text, privacy declarations, and remaining live checks. See [release notes](CHANGELOG.md) for v3.2.

## Support

- Issues: [GitHub Issues](https://github.com/MrAk47Anand007/A360_BotKit/issues)
- Email: [anandkalegak@gmail.com](mailto:anandkalegak@gmail.com)

## Important Note

A360 BotKit is an independent tool and is not affiliated with or endorsed by Automation Anywhere.

## License

[MIT](LICENSE)
