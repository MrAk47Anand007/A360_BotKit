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

## Why Teams Use It

- Faster debugging with line numbers in log messages
- Safer bot edits with quick copy and patch workflows
- Optional autosave for long editing sessions
- Clear status feedback directly in the popup and on the page
- Dark mode for daily use

## Main Features

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

1. Open an A360 bot editor page in Control Room.
2. Click the `A360 BotKit` extension icon.
3. Choose one of the tabs:
   - `Update Bot`
   - `Copy & Patch`
   - `Settings`
4. Run the tool you need.

## Permissions And Data Handling

A360 BotKit is designed for customer-hosted Control Room environments, so it must work across different HTTPS domains used by different A360 tenants.

The extension uses:

- `activeTab`
  To interact with the current tab when you use the popup.
- `storage`
  To store autosave preferences in `chrome.storage.local`.
- extension local storage
  To store the popup theme preference as `botkit-theme`.
- HTTPS page access
  To detect supported A360 bot editor pages and run the editor helpers needed for copy, patch, and autosave.

The extension handles:
- the current A360 editor URL and file ID
- the A360 auth token already present in your browser session
- bot content returned by your A360 Control Room
- current unsaved editor payloads when autosave is enabled

The extension sends this data only to the same A360 Control Room you are already signed in to. It does not send bot data, auth tokens, or analytics to the developer or to unrelated third-party services.

## Privacy Summary

- No ads
- No analytics
- No sale of user data
- No developer-operated backend service
- Data is used only to provide the extension's bot editing features inside A360

Read the full [Privacy Policy](privacy-policy.html).

## Installation

### Chrome Web Store

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/ieolchhicpekhpfnkbmbhliblcildhfn).

### Load Unpacked

```bash
git clone https://github.com/MrAk47Anand007/A360_BotKit.git
cd A360_BotKit
```

Then open `chrome://extensions`, enable Developer mode, and load the project folder as an unpacked extension.

## Support

- Issues: [GitHub Issues](https://github.com/MrAk47Anand007/A360_BotKit/issues)
- Email: [anandkalegak@gmail.com](mailto:anandkalegak@gmail.com)

## Important Note

A360 BotKit is an independent tool and is not affiliated with or endorsed by Automation Anywhere.

## License

[MIT](LICENSE)
