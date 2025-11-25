# A360 BotKit

Professional Chrome Extension for Automation Anywhere A360 Bot Enhancement

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

### From Source

1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/MrAk47Anand007/A360_BotKit.git
   cd A360_BotKit
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" by toggling the switch in the top right corner

4. Click "Load unpacked" and select the cloned repository folder

5. The extension should now be installed and visible in the Chrome toolbar

### From Chrome Web Store

*(Coming soon)*

## 🚀 Usage Guide

### Adding Line Numbers to Log Messages

#### Tab 1: Update Bot

1. Open your Automation Anywhere A360 bot in the editor
2. Click the A360 BotKit extension icon in the Chrome toolbar
3. The extension will automatically display the total line count
4. **Option A - Custom Placeholder:**
    - Enter your placeholder in the text area (e.g., `[linenumber]`, `{num}`, `LINENUM`)
    - Click "Validate Pattern" to preview the result
    - Click "Update Bot" to apply line numbers
5. **Option B - Auto-Detection:**
    - Leave the placeholder field empty
    - Click "Update Bot"
    - The extension automatically detects and updates existing patterns like `| 0 |`, `-5-`, etc.

**Example:**

Before:
```
Log: "anand [linenumber] error occurred"
Log: "anand [linenumber] processing"
```

After Update (line 2 and line 5):
```
Log: "anand [2] error occurred"
Log: "anand [5] processing"
```

**Supported Placeholder Formats:**
- Square brackets: `[linenumber]`, `[line number]`, `[line_number]`
- Curly braces: `{linenumber}`, `{line number}`
- Pipes: `|linenumber|`, `|line number|`
- Angle brackets: `<linenumber>`, `<line_number>`
- Custom text: Any text you want (e.g., `LINENUM`, `___NUM___`)
- Pattern mode: `| 0 |`, `[5]`, `#10#`, `-15-` (replaces numbers)

### Copying and Patching Bot Content

#### Tab 2: Copy & Patch

**To Backup Bot:**
1. Click the "Copy & Patch" tab
2. Click "Copy Bot Content"
3. Bot JSON is copied to your clipboard
4. Save to a file for backup

**To Restore Bot:**
1. Paste your saved bot JSON into the text area
2. Click "Patch Bot"
3. Confirm the warning dialog (ensure you have a backup!)
4. Page auto-refreshes with restored content

**Safety Tips:**
- ⚠️ Always backup your bot before patching
- ✅ Validate JSON format before patching
- ✅ Test in development environment first

### Dark Mode

1. Click the toggle switch in the top-right corner of the header
2. Choose between Light and Dark themes
3. Your preference is automatically saved
4. Theme persists across sessions

## 🎨 Features in Detail

### Dynamic Placeholder System

Unlike hardcoded solutions, A360 BotKit uses a truly dynamic system:

```javascript
// Works with ANY placeholder you provide!
User enters: "[linenumber]" → Finds it → Replaces with line number
User enters: "{mynum}" → Finds it → Replaces with line number
User enters: "XXXXX" → Finds it → Replaces with line number
```

**No limitations. No hardcoded patterns. Complete flexibility!**

### Auto-Refresh Feature

After successful operations:
- ✅ Update Bot → Auto-refresh after 1.5 seconds
- ✅ Patch Bot → Auto-refresh after 1.5 seconds
- ❌ On Error → No refresh (safe to retry)

**Seamless workflow with zero manual intervention!**

### Smart Validation

Real-time validation with helpful feedback:
- ✓ Valid placeholders show green confirmation
- ⚠ Custom placeholders show warning to verify
- ✗ Invalid formats show error message
- 📝 Example output shown for preview

### Statistics Reporting

After each update, view detailed stats:
- Total logs found
- Logs successfully updated
- Logs skipped (if any)
- Success rate percentage
- Pattern used
- Error details (if any)

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
if (currentLogContent.includes(logStructure)) {
    currentLogContent = currentLogContent.replace(
        new RegExp(logStructure.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        totalLineNumber
    );
}
```

**Safety Checks:**
```javascript
// Prevents crashes from undefined content
if (!currentLogContent || typeof currentLogContent !== 'string') {
    console.warn('Skipping log with invalid content');
    return;
}
```

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

## 👤 Author

**Anand S Kale**

- GitHub: [@MrAk47Anand007](https://github.com/MrAk47Anand007)
- Email: anandkalegak@gmail.com
- Project: [A360_BotKit](https://github.com/MrAk47Anand007/A360_BotKit)

## 🙏 Acknowledgments

- Automation Anywhere for the A360 platform
- Chrome Extension development community
- All contributors and users providing feedback

## 📞 Support

### Getting Help

- 📖 Read the documentation above
- 🐛 [Report bugs](https://github.com/MrAk47Anand007/A360_BotKit/issues)
- 💡 [Request features](https://github.com/MrAk47Anand007/A360_BotKit/issues)
- 📧 Email: anandkalegak@gmail.com

### FAQ

**Q: Does this work with A360 Enterprise?**  
A: Yes, it works with any A360 Control Room.

**Q: Will this modify my bot structure?**  
A: No, it only updates log message content, not bot structure.

**Q: Can I undo changes?**  
A: Yes, use the Copy & Patch feature to backup before making changes.

**Q: Does it work offline?**  
A: No, it requires connection to your A360 Control Room.

**Q: Is my data safe?**  
A: Yes, all processing is local. No data is sent to external servers.

## 🗺️ Roadmap

### Version 2.1 (Planned)
- [ ] Batch processing for multiple bots
- [ ] Custom log templates
- [ ] Export/Import settings
- [ ] Keyboard shortcuts

### Version 2.2 (Future)
- [ ] Variable renaming utility
- [ ] Comment injection tool
- [ ] Error handler generator
- [ ] Code formatting utilities

### Version 3.0 (Vision)
- [ ] AI-powered bot optimization
- [ ] Visual bot editor enhancements
- [ ] Team collaboration features
- [ ] Analytics dashboard

## 📊 Project Status

- ✅ **Stable** - Production ready
- ✅ **Actively Maintained** - Regular updates
- ✅ **Community Driven** - Open to contributions

## 🌟 Star History

If you find A360 BotKit useful, please consider giving it a star on GitHub! ⭐

---

**Made with ❤️ by Anand S Kale**

*A360 BotKit - Professional tweaker for A360 bot developers*