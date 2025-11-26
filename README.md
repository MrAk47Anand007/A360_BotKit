# A360 BotKit

Professional Chrome Extension for Automation Anywhere A360 Bot Enhancement

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?style=for-the-badge&logo=google-chrome)](https://chromewebstore.google.com/detail/ieolchhicpekhpfnkbmbhliblcildhfn)
[![Version](https://img.shields.io/badge/version-2.0-green?style=for-the-badge)](https://github.com/MrAk47Anand007/A360_BotKit)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](LICENSE)

## 🎯 Project Description

A360 BotKit is a powerful Chrome extension designed to enhance your Automation Anywhere A360 bot development workflow. This professional tweaker tool provides essential utilities to streamline bot creation, debugging, and maintenance with a focus on intelligent line number injection and bot content management.

### ✨ Key Features

- **🔢 Dynamic Line Number Injection** - Add line numbers to log messages with any custom placeholder
- **🎨 Dark Mode Support** - Eye-friendly dark theme with persistent preferences
- **🔄 Auto-Refresh** - Automatic page refresh after updates for seamless workflow
- **✅ Smart Validation** - Real-time placeholder validation with helpful examples
- **📊 Statistics Reporting** - Detailed update reports with success rates
- **📋 Copy & Patch** - Easy bot content backup and restoration
- **🎯 Auto-Detection** - Automatically detects existing line number patterns
- **🛡️ Safety Checks** - Built-in error handling and crash prevention

## 📦 Installation Instructions

### From Chrome Web Store (Recommended)

1. Visit the **[A360 BotKit Chrome Web Store page](https://chromewebstore.google.com/detail/ieolchhicpekhpfnkbmbhliblcildhfn)**

2. Click **"Add to Chrome"** button

3. Click **"Add extension"** in the confirmation dialog

4. The extension icon will appear in your Chrome toolbar

5. **You're ready to go!** Open an A360 bot editor and click the extension icon

### From Source (For Developers)

1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/MrAk47Anand007/A360_BotKit.git
   cd A360_BotKit
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" by toggling the switch in the top right corner

4. Click "Load unpacked" and select the cloned repository folder

5. The extension should now be installed and visible in the Chrome toolbar

## 🚀 Complete Usage Guide

### Prerequisites

Before using A360 BotKit, ensure you have:
- ✅ Active Automation Anywhere A360 account
- ✅ Access to A360 Control Room
- ✅ At least one bot with log actions
- ✅ Chrome browser with the extension installed

---

## 📖 Step-by-Step Tutorial

### Tutorial 1: Adding Line Numbers to Your Bot (Basic)

**Scenario:** You have a bot with multiple log messages and want to add line numbers for easier debugging.

#### Step 1: Prepare Your Bot

In your A360 bot, add log messages with a placeholder:

```
Log to file: "Process started [LINE]"
Log to file: "Reading input data [LINE]"
Log to file: "Validating data [LINE]"
Log to file: "Processing record [LINE]"
Log to file: "Writing output [LINE]"
Log to file: "Process completed [LINE]"
```

**Note:** You can use ANY placeholder you want - `[LINE]`, `{num}`, `|linenumber|`, `___NUM___`, etc.

#### Step 2: Open the Extension

1. Navigate to your bot in A360 Control Room
2. Make sure you're in the **bot editor** page (URL should end with `/edit`)
3. Click the **A360 BotKit** icon in your Chrome toolbar
4. The popup will open and show:
    - ✅ Green status: "Bot loaded: X lines" (if successful)
    - ❌ Red status: "Open an A360 bot editor page" (if you're not on the right page)

#### Step 3: Enter Your Placeholder

1. In the **"Update Bot"** tab (default tab)
2. Look for the **"Placeholder Pattern"** text area
3. Type your placeholder exactly as it appears in your logs: `[LINE]`
4. Click **"Validate Pattern"** button
5. You'll see: `✓ Valid pattern placeholder` with an example: `[42]`

#### Step 4: Update the Bot

1. Click the **"Update Bot"** button
2. You'll see a loader animation
3. Status will show: "Updating bot..."
4. After a few seconds: "✓ Bot updated! Refreshing page..."
5. The page automatically refreshes

#### Step 5: Verify the Results

After the page refreshes, check your log messages:

```
Log to file: "Process started [1]"           ← Line 1
Log to file: "Reading input data [2]"        ← Line 2
Log to file: "Validating data [3]"           ← Line 3
Log to file: "Processing record [4]"         ← Line 4
Log to file: "Writing output [5]"            ← Line 5
Log to file: "Process completed [6]"         ← Line 6
```

**🎉 Done!** Your log messages now have actual line numbers!

---

### Tutorial 2: Using Auto-Detection (No Placeholder Needed)

**Scenario:** You have a bot with existing line number patterns like `| 0 |` or `-5-` and want to update them.

#### Example Bot Content:

```
Log to file: "START | 0 | Process beginning"
Log to file: "INFO | 0 | Loading configuration"
If condition:
    Log to file: "DEBUG | 0 | Inside if block"
    Log to file: "INFO | 0 | Executing action"
End If
Log to file: "END | 0 | Process completed"
```

#### Steps:

1. Open the extension on your bot editor page
2. **Leave the placeholder field EMPTY**
3. Click **"Update Bot"** directly
4. The extension automatically detects the `| 0 |` pattern
5. Page refreshes automatically

#### Result:

```
Log to file: "START | 1 | Process beginning"       ← Line 1
Log to file: "INFO | 2 | Loading configuration"    ← Line 2
If condition:
    Log to file: "DEBUG | 3 | Inside if block"     ← Line 3
    Log to file: "INFO | 4 | Executing action"     ← Line 4
End If
Log to file: "END | 5 | Process completed"         ← Line 5
```

**Auto-Detection Patterns Supported:**
- `| 0 |`, `| 5 |`, `| 10 |` → Pipe with spaces
- `[0]`, `[5]`, `[10]` → Square brackets with numbers
- `-0-`, `-5-`, `-10-` → Hyphens with numbers
- `#0#`, `#5#`, `#10#` → Hash symbols with numbers

---

### Tutorial 3: Advanced - Custom Placeholder Formats

**Scenario:** You want to use creative or company-specific placeholder formats.

#### Example 1: Company Standard Format

Your company uses: `Error at line: LINENUM`

```
Log to file: "Error at line: LINENUM - File not found"
Log to file: "Error at line: LINENUM - Invalid data"
Log to file: "Error at line: LINENUM - Connection timeout"
```

**Steps:**
1. Enter placeholder: `LINENUM`
2. Click "Validate Pattern"
3. See example: `42` (your text replaced with line number)
4. Click "Update Bot"

**Result:**
```
Log to file: "Error at line: 1 - File not found"
Log to file: "Error at line: 2 - Invalid data"
Log to file: "Error at line: 3 - Connection timeout"
```

#### Example 2: Multi-Character Wrapper

Your logs use: `<<< LINE >>>`

```
Log to file: "<<< LINE >>> Process started"
Log to file: "<<< LINE >>> Data validated"
Log to file: "<<< LINE >>> Process ended"
```

**Steps:**
1. Enter placeholder: `<<< LINE >>>`
2. Validate (will show custom placeholder warning)
3. Update bot

**Result:**
```
Log to file: "<<< 1 >>> Process started"
Log to file: "<<< 2 >>> Data validated"
Log to file: "<<< 3 >>> Process ended"
```

---

### Tutorial 4: Backup and Restore Bot (Copy & Patch)

**Scenario:** You want to backup your bot before making changes, or restore a previous version.

#### Backing Up Your Bot:

1. Open the extension
2. Click **"Copy & Patch"** tab
3. Click **"Copy Bot Content"** button
4. Status shows: "✓ Copied to clipboard!"
5. Open Notepad or any text editor
6. Press `Ctrl+V` to paste
7. Save the file as `my-bot-backup-2024-11-26.json`

**Tip:** Name your backups with dates for easy identification!

#### Restoring Your Bot:

1. Open your backup file
2. Select all content (`Ctrl+A`) and copy (`Ctrl+C`)
3. Open the extension on your bot editor page
4. Click **"Copy & Patch"** tab
5. Paste the content in the **"Bot Content (JSON)"** text area
6. Click **"Patch Bot"** button
7. Confirm the warning dialog: "⚠ This will replace your bot. Have you backed it up?"
8. Click **OK**
9. Status shows: "✓ Bot patched! Refreshing page..."
10. Page automatically refreshes with restored content

**⚠️ Important Safety Tips:**
- Always backup before patching
- Verify JSON format (should be valid JSON)
- Test in development environment first
- Keep multiple backup versions

---

## 🎨 Using Dark Mode

### Enabling Dark Mode:

1. Open the extension
2. Look at the top-right corner of the header
3. You'll see a toggle switch with "Light" label
4. Click the toggle switch
5. Interface instantly switches to dark theme
6. Label changes to "Dark"

### Benefits:
- 👁️ Reduces eye strain during long coding sessions
- 🌙 Perfect for night-time bot development
- 💾 Preference is saved automatically
- 🔄 Works across all Chrome sessions

---

## 📊 Understanding Statistics Report

After updating your bot, you'll see a detailed statistics report:

### Report Components:

```
┌─────────────────────────────────────┐
│  Update Report                      │
├─────────────────────────────────────┤
│  Progress Bar: ████████████ 100%    │
│                                     │
│  Total: 25      Updated: 25        │
│  Skipped: 0     Rate: 100.00%      │
│                                     │
│  Pattern: [LINE]                    │
└─────────────────────────────────────┘
```

**What Each Metric Means:**

- **Total:** Number of log actions found in your bot
- **Updated:** Number of logs successfully updated with line numbers
- **Skipped:** Logs that couldn't be updated (no placeholder found)
- **Success Rate:** Percentage of successful updates
- **Pattern Used:** The placeholder pattern that was applied

**Example Scenarios:**

**Scenario 1: Perfect Update**
```
Total: 50 | Updated: 50 | Skipped: 0 | Rate: 100.00%
→ All logs updated successfully!
```

**Scenario 2: Partial Update**
```
Total: 50 | Updated: 30 | Skipped: 20 | Rate: 60.00%
→ Some logs don't have the placeholder
→ Check if all logs have the placeholder text
```

**Scenario 3: No Updates**
```
Total: 50 | Updated: 0 | Skipped: 50 | Rate: 0.00%
→ Placeholder not found in any log
→ Verify placeholder text matches exactly
```

---

## 🔍 Troubleshooting Guide

### Issue 1: "Auth token not found - refresh the page"

**Cause:** Extension can't access your A360 authentication token.

**Solutions:**
1. Refresh the A360 bot editor page
2. Click the red "Refresh Page" button in the extension
3. Log out and log back into A360 Control Room
4. Clear browser cache and cookies for A360 domain
5. Try a different Chrome profile

### Issue 2: "Open an A360 bot editor page"

**Cause:** You're not on a bot editor page.

**Solutions:**
1. Navigate to your bot in A360
2. Click "Edit" to open the bot editor
3. Verify URL ends with `/edit`
4. Example correct URL: `https://your-control-room.com/#/bots/repository/private/Bot123/456/edit`

### Issue 3: "No logs updated" (0.00% success rate)

**Cause:** Placeholder doesn't match what's in your logs.

**Solutions:**
1. Check your log messages in the bot editor
2. Verify placeholder spelling exactly matches
3. Check for extra spaces or special characters
4. Try using auto-detection (leave placeholder empty)
5. Use the "Validate Pattern" button to test

### Issue 4: Extension icon not showing in toolbar

**Cause:** Extension not properly installed or hidden.

**Solutions:**
1. Click the puzzle piece icon in Chrome toolbar
2. Find "A360 BotKit" in the list
3. Click the pin icon to pin it to toolbar
4. Reload the extension from `chrome://extensions/`
5. Try reinstalling from Chrome Web Store

### Issue 5: "Invalid JSON format" when patching

**Cause:** Bot content is not valid JSON.

**Solutions:**
1. Copy fresh content using "Copy Bot Content" button
2. Don't manually edit the JSON unless you know JSON syntax
3. Use a JSON validator tool online before pasting
4. Ensure all quotes and brackets are properly matched
5. Check for trailing commas or missing brackets

### Issue 6: Some logs updated, some skipped

**Cause:** Not all logs have the placeholder.

**Solutions:**
1. Check the statistics report for count
2. Manually add placeholder to remaining logs
3. Use different placeholder for different log groups
4. Run update multiple times with different placeholders

---

## 💡 Best Practices

### 1. Development Workflow

```
1. Backup bot (Copy & Patch)
   ↓
2. Add placeholder to all log messages
   ↓
3. Validate placeholder pattern
   ↓
4. Update bot
   ↓
5. Verify results
   ↓
6. Save final version
```

### 2. Placeholder Naming Conventions

**Good Placeholders:**
- `[LINE]` - Simple and clear
- `{num}` - Short and easy to type
- `|linenumber|` - Descriptive
- `__LINE__` - Stands out visually

**Avoid:**
- Common words like `line`, `number` (might appear elsewhere)
- Very short placeholders like `X`, `N` (prone to false matches)
- Special regex characters without escaping

### 3. Team Collaboration

If working in a team:
1. Agree on a standard placeholder format
2. Document the placeholder in your team wiki
3. Add placeholder to all new bots from the start
4. Update placeholders regularly during development
5. Include line numbers in error reports

### 4. Large Bots (100+ lines)

For very large bots:
1. Break into sub-bots if possible
2. Use consistent placeholder throughout
3. Update in batches if needed
4. Always check statistics report
5. Keep backups before major updates

### 5. Debugging Strategy

Use line numbers effectively:
```
Log: "[1] START: Main process"
Log: "[2] Reading config: ${configFile}"
Try:
    Log: "[3] Connecting to database"
    Log: "[4] Executing query: ${query}"
Catch:
    Log: "[5] ERROR at line [5]: ${exception}"
End Try
Log: "[6] END: Process completed"
```

Now your error logs show exact line numbers for quick debugging!

---

## 🎯 Real-World Use Cases

### Use Case 1: Production Bot Debugging

**Challenge:** A production bot fails at random points, and you need to identify where.

**Solution:**
1. Add placeholder to all log actions: `[LINE]`
2. Use A360 BotKit to inject line numbers
3. Deploy updated bot
4. Check log files when errors occur
5. Line numbers show exact failure point
6. Fix the specific line causing issues

**Result:** Debugging time reduced from hours to minutes!

### Use Case 2: Bot Performance Analysis

**Challenge:** Need to measure execution time between different sections.

**Solution:**
```
Log: "[1] START Section A: ${datetime}"
... Section A code ...
Log: "[15] END Section A: ${datetime}"
Log: "[16] START Section B: ${datetime}"
... Section B code ...
Log: "[30] END Section B: ${datetime}"
```

**Result:** Calculate time difference between line 1-15 and 16-30!

### Use Case 3: Compliance and Audit Trail

**Challenge:** Must provide detailed audit logs with exact execution sequence.

**Solution:**
1. Add line numbers to all business-critical actions
2. Export log files with line numbers
3. Submit logs showing complete execution sequence
4. Line numbers prove correct process flow

**Result:** Easy compliance documentation!

### Use Case 4: Team Code Review

**Challenge:** Discussing bot improvements in team meetings.

**Solution:**
1. Share bot with line numbers
2. Reference specific lines in discussions
3. "Line 45 could be optimized"
4. "Add error handling at line 67"
5. Everyone knows exactly what to change

**Result:** More efficient code reviews!

---

## 🌟 Pro Tips

### Tip 1: Version Control Your Logs

Use placeholders that include version info:
```
Log: "v2.1 [LINE] Processing started"
```

### Tip 2: Conditional Placeholders

Use different placeholders for different environments:
```
Dev: [DEV-LINE]
QA: [QA-LINE]  
Prod: [PROD-LINE]
```

### Tip 3: Nested Structures

Line numbers work in nested conditions too!
```
Log: "[1] Main flow"
If condition:
    Log: "[2] Inside if"
    Loop:
        Log: "[3] Inside loop"
        Log: "[4] Processing item"
    End Loop
    Log: "[5] After loop"
End If
Log: "[6] Main flow continues"
```

### Tip 4: Quick Backup Shortcut

Before any major change:
1. Copy & Patch → Copy Bot Content
2. Save as `bot-before-change.json`
3. Make your changes
4. If issues arise, patch back immediately

### Tip 5: Statistics-Driven Development

After updating:
- 100% success rate → Perfect!
- 80-99% success rate → Check skipped logs
- Below 80% → Review placeholder usage
- 0% success rate → Placeholder mismatch

---

## 🛠️ Technical Details

### Architecture

```
A360_BotKit/
├── background/
│   ├── background.js         # Service worker, message handling
│   └── control_room.js        # A360 API integration, bot processing
├── popup/
│   ├── popup.html            # Extension UI with dark mode
│   └── popup.js              # UI logic, validation, dark mode toggle
├── content_scripts/
│   └── content.js            # Page context, auth token extraction
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── manifest.json             # Extension configuration
```

### Core Technologies

- **JavaScript ES6+** - Modern async/await patterns
- **Chrome Extension API** - Manifest V3 compliant
- **A360 Control Room API** - Direct integration with Automation Anywhere
- **CSS3** - Smooth transitions, dark mode support
- **LocalStorage** - Preference persistence

### Key Functions

**Line Number Injection:**
```javascript
// Dynamic placeholder replacement
function applyPlaceholderReplacement(currentLogContent, totalLineNumber, logStructure) {
    if (logStructure && logStructure.trim()) {
        const rawPlaceholder = logStructure.trim();
        let escaped = rawPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        escaped = escaped.replace(/\s+/g, '\\s*');
        const placeholderRegex = new RegExp(escaped, 'gi');
        
        if (placeholderRegex.test(currentLogContent)) {
            return currentLogContent.replace(placeholderRegex, String(totalLineNumber));
        }
    }
    return currentLogContent;
}
```

**Safety Checks:**
```javascript
// Prevents crashes from undefined content
if (!content || typeof content !== 'string') {
    console.warn('Skipping log with invalid content at line', totalLineNumber);
    return;
}
```

---

## 🤝 Contribution Guidelines

We welcome contributions to improve A360 BotKit! Here's how you can help:

### Getting Started

1. **Fork the repository**
   ```bash
   git fork https://github.com/MrAk47Anand007/A360_BotKit.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
    - Follow existing code style
    - Add comments for complex logic
    - Test thoroughly

4. **Commit with clear messages**
   ```bash
   git commit -m "Add: Amazing feature that does X"
   ```

5. **Push and create Pull Request**
   ```bash
   git push origin feature/amazing-feature
   ```

### Contribution Ideas

- 🐛 Bug fixes and error handling improvements
- ✨ New features for bot manipulation
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🌐 Internationalization support
- ⚡ Performance optimizations
- 🧪 Test coverage

### Code Style Guidelines

- Use ES6+ features (arrow functions, async/await, destructuring)
- Add JSDoc comments for functions
- Keep functions small and focused
- Handle errors gracefully
- Follow existing naming conventions

### Testing Your Changes

1. Load unpacked extension in Chrome
2. Test with real A360 bots
3. Verify dark mode works
4. Check console for errors
5. Test both Update and Patch features
6. Verify auto-refresh functionality

---

## 📋 Dependencies and Prerequisites

### Required

- **Google Chrome** (version 88 or higher)
- **Automation Anywhere A360** subscription and bot editor access
- Basic understanding of A360 bot structure

### Development

- Basic knowledge of JavaScript and Chrome extensions
- Familiarity with Git and GitHub
- Text editor or IDE (VS Code recommended)

### Browser Permissions

The extension requires:
- `activeTab` - To interact with A360 bot editor
- Access to A360 Control Room API endpoints

**Privacy Note:** All operations are performed locally. No data is sent to external servers. See [Privacy Policy](privacy-policy.html) for details.

---

## 🔒 Security and Privacy

A360 BotKit is designed with security and privacy as top priorities:

✅ **No Data Collection** - We don't collect any personal information  
✅ **Local Processing** - All operations happen in your browser  
✅ **No External Servers** - No data sent to third parties  
✅ **Open Source** - Complete transparency, audit the code yourself  
✅ **Secure API Communication** - Direct connection to your A360 Control Room

The extension only:
- Accesses your A360 authentication token from browser storage (never transmitted externally)
- Communicates with your configured A360 Control Room
- Stores theme preference in browser localStorage

**Full Privacy Policy:** [Read Here](privacy-policy.html)

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 Anand S Kale

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

See the [LICENSE](LICENSE) file for full details.

---

## 👤 Author

**Anand S Kale**

- GitHub: [@MrAk47Anand007](https://github.com/MrAk47Anand007)
- Email: anandkalegak@gmail.com
- Project: [A360_BotKit](https://github.com/MrAk47Anand007/A360_BotKit)
- Chrome Web Store: [Install Extension](https://chromewebstore.google.com/detail/ieolchhicpekhpfnkbmbhliblcildhfn)

---

## 🙏 Acknowledgments

- Automation Anywhere for the A360 platform
- Chrome Extension development community
- All contributors and users providing feedback
- Everyone who has starred the repository ⭐

---

## 📞 Support

### Getting Help

- 📖 Read the complete documentation above
- 🐛 [Report bugs](https://github.com/MrAk47Anand007/A360_BotKit/issues)
- 💡 [Request features](https://github.com/MrAk47Anand007/A360_BotKit/issues)
- ⭐ [Leave a review on Chrome Web Store](https://chromewebstore.google.com/detail/ieolchhicpekhpfnkbmbhliblcildhfn)
- 📧 Email: anandkalegak@gmail.com

### FAQ

**Q: Does this work with A360 Enterprise and Community editions?**  
A: Yes, it works with any A360 Control Room - Enterprise, Community, or Cloud.

**Q: Will this modify my bot structure or logic?**  
A: No, it only updates log message content (text), not bot structure, conditions, or logic.

**Q: Can I undo changes if something goes wrong?**  
A: Yes! Use the Copy & Patch feature to backup before making changes, then restore if needed.

**Q: Does it work offline?**  
A: No, it requires an active connection to your A360 Control Room to fetch and update bot content.

**Q: Is my bot data and credentials safe?**  
A: Yes! All processing is local in your browser. No data is sent to external servers. Only communicates with your A360 Control Room.

**Q: Can I use this on multiple bots at once?**  
A: Currently, you need to open and update each bot individually. Batch processing is planned for a future version.

**Q: What if I use different Control Room URLs?**  
A: The extension works with any A360 Control Room URL. It automatically detects your current Control Room.

**Q: Does it work with bots in folders or only root level?**  
A: Works with bots anywhere - public/private repositories, nested folders, any location in your Control Room.

**Q: Can I customize the line number format?**  
A: Currently supports standard numeric line numbers. Custom formatting (e.g., "Line-001") is planned for future versions.

**Q: Is there a limit to bot size?**  
A: No hard limit, but very large bots (1000+ lines) may take a few extra seconds to process.

---

## 🗺️ Roadmap

### Version 2.1 (Upcoming)
- [ ] Batch processing for multiple bots
- [ ] Custom line number formatting (e.g., "Line-001", "L-042")
- [ ] Export/Import settings and preferences
- [ ] Keyboard shortcuts for quick access
- [ ] Multi-language support

### Version 2.2 (Planned)
- [ ] Variable renaming utility across entire bot
- [ ] Comment injection tool for documentation
- [ ] Error handler generator for try-catch blocks
- [ ] Code formatting and beautification utilities
- [ ] Bot comparison tool (diff viewer)

### Version 3.0 (Future Vision)
- [ ] AI-powered bot optimization suggestions
- [ ] Visual bot editor enhancements
- [ ] Team collaboration features
- [ ] Analytics dashboard for bot performance
- [ ] Version control integration

**Want to influence the roadmap?** Submit feature requests on [GitHub Issues](https://github.com/MrAk47Anand007/A360_BotKit/issues)!

---

## 📊 Project Status

- ✅ **Stable** - Production ready and actively used
- ✅ **Published** - Available on Chrome Web Store
- ✅ **Actively Maintained** - Regular updates and bug fixes
- ✅ **Community Driven** - Open to contributions and feedback

---

## 🌟 Show Your Support

If you find A360 BotKit useful, please consider:

- ⭐ **Star the repository** on [GitHub](https://github.com/MrAk47Anand007/A360_BotKit)
- ⭐ **Rate the extension** on [Chrome Web Store](https://chromewebstore.google.com/detail/ieolchhicpekhpfnkbmbhliblcildhfn)
- 📢 **Share with colleagues** who use Automation Anywhere
- 🐛 **Report bugs** to help improve the extension
- 💡 **Suggest features** you'd like to see
- 🤝 **Contribute code** if you're a developer

Every star and review helps others discover the extension!

---

## 📈 Statistics

- **Active Users:** Growing daily
- **Bots Enhanced:** Thousands across multiple organizations
- **Lines Processed:** Millions of log lines updated
- **Time Saved:** Countless hours in debugging and maintenance

---

## 🎓 Learn More

### Resources

- **Documentation:** This README (you're reading it!)
- **Source Code:** [GitHub Repository](https://github.com/MrAk47Anand007/A360_BotKit)
- **Privacy Policy:** [privacy-policy.html](privacy-policy.html)
- **License:** [MIT License](LICENSE)
- **Chrome Web Store:** [Extension Page](https://chromewebstore.google.com/detail/ieolchhicpekhpfnkbmbhliblcildhfn)

### Video Tutorials

*(Coming soon - video walkthroughs for each feature)*

---

<div align="center">

## Made with ❤️ by [Anand S Kale](https://github.com/MrAk47Anand007)

**A360 BotKit - Professional Tweaker for Automation Anywhere A360 Bot Developers**

[Install Now](https://chromewebstore.google.com/detail/ieolchhicpekhpfnkbmbhliblcildhfn) | [View Source](https://github.com/MrAk47Anand007/A360_BotKit) | [Report Issue](https://github.com/MrAk47Anand007/A360_BotKit/issues) | [Request Feature](https://github.com/MrAk47Anand007/A360_BotKit/issues)

---

### ⭐ If this extension helped you, please star the repo and leave a review! ⭐

</div>