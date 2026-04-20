# Graph Report - .  (2026-04-19)

## Corpus Check
- Corpus is ~11,890 words - fits in a single context window. You may not need a graph.

## Summary
- 52 nodes · 79 edges · 10 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Control Room Sync|Control Room Sync]]
- [[_COMMUNITY_Popup Validation UI|Popup Validation UI]]
- [[_COMMUNITY_Patch Processing Logic|Patch Processing Logic]]
- [[_COMMUNITY_User Workflow Surface|User Workflow Surface]]
- [[_COMMUNITY_Token Privacy Model|Token Privacy Model]]
- [[_COMMUNITY_Popup Status Feedback|Popup Status Feedback]]
- [[_COMMUNITY_Extension Branding|Extension Branding]]
- [[_COMMUNITY_Page Detection Flow|Page Detection Flow]]
- [[_COMMUNITY_Background Entry|Background Entry]]
- [[_COMMUNITY_Content Script Entry|Content Script Entry]]

## God Nodes (most connected - your core abstractions)
1. `fetchLineCount()` - 8 edges
2. `Popup controller` - 8 edges
3. `A360 BotKit privacy policy` - 8 edges
4. `Control Room API helper module` - 7 edges
5. `A360 BotKit Chrome extension` - 7 edges
6. `Background message router` - 6 edges
7. `A360 BotKit README` - 6 edges
8. `handlePageLoad()` - 5 edges
9. `Patch bot content from pasted JSON` - 4 edges
10. `Dynamic line number injection` - 4 edges

## Surprising Connections (you probably didn't know these)
- `A360 BotKit app icon artwork (16px)` --conceptually_related_to--> `A360 BotKit Chrome extension`  [INFERRED]
  icons/icon16.png → README.md
- `A360 BotKit app icon artwork (32px)` --conceptually_related_to--> `A360 BotKit Chrome extension`  [INFERRED]
  icons/icon32.png → README.md
- `A360 BotKit app icon artwork (48px)` --conceptually_related_to--> `A360 BotKit Chrome extension`  [INFERRED]
  icons/icon48.png → README.md
- `A360 BotKit app icon artwork (128px)` --conceptually_related_to--> `A360 BotKit Chrome extension`  [INFERRED]
  icons/icon128.png → README.md
- `Control Room API helper module` --references--> `Token used only for Control Room requests`  [EXTRACTED]
  background/control_room.js → privacy-policy.html

## Communities

### Community 0 - "Control Room Sync"
Cohesion: 0.44
Nodes (9): Automation Anywhere A360 Control Room API, Background message router, Count bot log lines, Control Room API helper module, Fetch bot content, Update bot content, Patch bot content from pasted JSON, Inject line numbers into log messages (+1 more)

### Community 1 - "Popup Validation UI"
Cohesion: 0.25
Nodes (0): 

### Community 2 - "Patch Processing Logic"
Cohesion: 0.33
Nodes (2): calculateTotalLines(), countLinesAccurately()

### Community 3 - "User Workflow Surface"
Cohesion: 0.47
Nodes (6): Copy and patch workflow, Dark mode preference in localStorage, Popup interface markup, Popup controller, A360 BotKit README, Placeholder validation and statistics

### Community 4 - "Token Privacy Model"
Cohesion: 0.47
Nodes (6): Auth token is only used for Control Room API calls, Tab details and auth token extractor, Operations run locally in the browser, No personal data collection, A360 BotKit privacy policy, Token used only for Control Room requests

### Community 5 - "Popup Status Feedback"
Cohesion: 0.4
Nodes (5): fetchLineCount(), hideLoader(), hideStats(), showLoader(), showStatus()

### Community 6 - "Extension Branding"
Cohesion: 0.4
Nodes (5): A360 BotKit Chrome extension, A360 BotKit app icon artwork (128px), A360 BotKit app icon artwork (16px), A360 BotKit app icon artwork (32px), A360 BotKit app icon artwork (48px)

### Community 7 - "Page Detection Flow"
Cohesion: 0.5
Nodes (4): getTabDetails(), handlePageLoad(), isA360BotPage(), showPageStatus()

### Community 8 - "Background Entry"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Content Script Entry"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **5 isolated node(s):** `Popup interface markup`, `A360 BotKit app icon artwork (16px)`, `A360 BotKit app icon artwork (32px)`, `A360 BotKit app icon artwork (48px)`, `A360 BotKit app icon artwork (128px)`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Background Entry`** (1 nodes): `background.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Content Script Entry`** (1 nodes): `content.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Popup controller` connect `User Workflow Surface` to `Control Room Sync`, `Token Privacy Model`, `Extension Branding`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `A360 BotKit Chrome extension` connect `Extension Branding` to `User Workflow Surface`, `Token Privacy Model`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `A360 BotKit privacy policy` connect `Token Privacy Model` to `User Workflow Surface`, `Extension Branding`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `A360 BotKit Chrome extension` (e.g. with `A360 BotKit app icon artwork (16px)` and `A360 BotKit app icon artwork (32px)`) actually correct?**
  _`A360 BotKit Chrome extension` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Popup interface markup`, `A360 BotKit app icon artwork (16px)`, `A360 BotKit app icon artwork (32px)` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._