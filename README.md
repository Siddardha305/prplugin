# SmartAdverts Premiere Tools

A personal editing toolbox plugin for Adobe Premiere Pro built on Adobe's modern **UXP (Unified Extensibility Platform)** architecture.

---

## 📌 Table of Contents
1. [Overview & Features](#overview--features)
2. [Phase 1 Implemented vs Planned Features](#phase-1-features)
3. [System Requirements](#system-requirements)
4. [Step-by-Step Installation & Setup](#step-by-step-installation--setup)
   - [Step 1: Install UXP Developer Tool (UDT)](#step-1-install-uxp-developer-tool-udt)
   - [Step 2: Enable Developer Mode in Premiere Pro](#step-2-enable-developer-mode-in-premiere-pro)
   - [Step 3: Load Plugin into UXP Developer Tool](#step-3-load-plugin-into-uxp-developer-tool)
   - [Step 4: Launch and Test in Premiere Pro](#step-4-launch-and-test-in-premiere-pro)
5. [Debugging and Live Reloading](#debugging-and-live-reloading)
6. [Packaging Locally (.ccx)](#packaging-locally-ccx)
7. [Project Structure](#project-structure)
8. [Premiere Pro UXP API Architecture Notes](#premiere-pro-uxp-api-architecture-notes)
9. [How to Add New Tools in Phase 2](#how-to-add-new-tools-in-phase-2)

---

## 🚀 Overview & Features

**SmartAdverts Premiere Tools** is designed for fast-paced video editing workflows (YouTube videos, Instagram Reels, YouTube Shorts, TikToks, and client commercial deliverables).

### Highlights:
- **Native Premiere Pro Dark UI**: Custom-built dark theme with clear visual hierarchy, active/hover/disabled states, and real-time status feedback.
- **Pure Modern UXP**: No legacy CEP or JSX bridging overhead. Uses native Premiere Pro DOM and asynchronous action transactions.
- **Live Project & Sequence Inspector**: Displays live project name, active sequence name, video resolution (e.g. `1920 × 1080`), aspect ratio classification, and playhead timecode.
- **Instant Aspect Ratio Sequence Creator**: 1-click generation of 16:9 Landscape, 9:16 Vertical (Shorts/Reels), and 1:1 Square sequences.
- **Playhead Marker Tool**: Adds named comment markers directly at the playhead position using UXP transactions (`createAddMarkerAction`).
- **Built-in Debug Console**: Real-time log capture and diagnostic status monitor inside the panel.

---

## 📊 Phase 1 Features

| Feature Area | Action / Feature | Phase 1 Status | API Method / Implementation |
| :--- | :--- | :--- | :--- |
| **Project** | Connection Status Detection | ✅ **Active** | `ppro.Project.getActiveProject()` |
| **Project** | Query Project Name | ✅ **Active** | `project.name` |
| **Sequence** | Query Active Sequence Name | ✅ **Active** | `project.getActiveSequence()` |
| **Sequence** | Read Resolution & Aspect Ratio | ✅ **Active** | `sequence.getFrameSize()` / `SequenceSettings` |
| **Sequence** | Read Current Playhead Timecode | ✅ **Active** | `sequence.getPlayerPosition()` (`TickTime`) |
| **Aspect Ratio** | 16:9 Landscape (1920 × 1080) | ✅ **Active** | `project.createSequence(name)` |
| **Aspect Ratio** | 9:16 Vertical (1080 × 1920) | ✅ **Active** | `project.createSequence(name)` |
| **Aspect Ratio** | 1:1 Square (1080 × 1080) | ✅ **Active** | `project.createSequence(name)` |
| **Timeline** | Add Marker at Playhead | ✅ **Active** | `Markers.createAddMarkerAction` + `executeTransaction` |
| **Timeline** | Read Playhead Position | ✅ **Active** | `sequence.getPlayerPosition()` |
| **Thumbnail** | Capture Frame Info | ✅ **Active** | Frame timecode & sequence metadata inspector |
| **Video Tools** | Remove Silence (Auto-cut) | ⏳ *Phase 2* | Audio track analysis & ripple edit |
| **Captions** | Caption Styling & Subtitles | ⏳ *Phase 2* | Caption text & style presets |
| **Thumbnail** | Export Current Frame File | ⏳ *Phase 2* | UXP file export workflow |

---

## 💻 System Requirements

- **Operating System**: Windows 10/11 or macOS
- **Adobe Premiere Pro**: Version **25.0 or newer** (Recommended: 25.6+ for full UXP Action & Marker DOM support)
- **Adobe UXP Developer Tool (UDT)**: Version 2.0+ (Free via Creative Cloud Desktop app)

---

## 🛠 Step-by-Step Installation & Setup

### Step 1: Install UXP Developer Tool (UDT)
1. Open the **Creative Cloud Desktop** application.
2. Go to the **Apps** tab.
3. In the left sidebar or search bar, look for **UXP Developer Tool**.
4. Click **Install**.

### Step 2: Enable Developer Mode in Premiere Pro
1. Launch **Adobe Premiere Pro**.
2. Open any existing project or create a new test project.
3. In the top menu, go to:
   - **Edit** > **Preferences** > **Plugins...** (Windows)
   - *(or **Premiere Pro** > **Settings** > **Plugins...** on macOS)*
4. Check the box **Enable Developer Mode**.
5. Click **OK**, then **restart Premiere Pro** to apply the setting.

### Step 3: Load Plugin into UXP Developer Tool
1. Launch the **UXP Developer Tool (UDT)**.
2. Click **Add Plugin** in the top-right corner.
3. Browse to the folder:
   ```
   d:\code\prextension\manifest.json
   ```
   Select `manifest.json` and click **Open**.
4. The plugin **SmartAdverts Premiere Tools** will now appear in your UXP Developer Tool plugin list.

### Step 4: Launch and Test in Premiere Pro
1. Ensure Premiere Pro is running with an open project.
2. In the UXP Developer Tool, find **SmartAdverts Premiere Tools**.
3. Click the **•••** (Actions) menu on the right and click **Load** (or click the **Load** button).
4. Inside Premiere Pro, open the panel by going to:
   - **Window** > **UXP Plugins** (or **Window** > **Extensions**) > **SmartAdverts Premiere Tools**.
5. The panel will dock into your workspace!

---

## 🔍 Debugging and Live Reloading

### Live Inspecting & DevTools
1. In the **UXP Developer Tool**, click the **•••** menu next to your loaded plugin.
2. Select **Debug**.
3. A Chrome DevTools window will open, allowing you to:
   - Inspect DOM elements and CSS styles.
   - Set breakpoints in JavaScript (`src/premiere.js`, `src/timeline.js`, etc.).
   - Execute live commands in the Console.

### Live Reload After Code Changes
- When you edit any `.html`, `.css`, or `.js` file, go to the UXP Developer Tool and click **Reload** (or press `Ctrl+R` / `Cmd+R` in the debugger).
- Your panel will update instantly without needing to restart Premiere Pro.

---

## 📦 Packaging Locally (.ccx)

To share the plugin with your other workstations without using developer mode:
1. Open the **UXP Developer Tool**.
2. Click **•••** on the plugin card and select **Package...**.
3. Choose an output directory.
4. UDT will produce a `.ccx` file (e.g. `SmartAdverts-Premiere-Tools.ccx`).
5. Double-click the `.ccx` file to install it directly into Premiere Pro.

---

## 📂 Project Structure

```
SmartAdverts-Premiere-Tools/
│
├── manifest.json         # UXP Manifest v5 defining panel entrypoint & host requirements
├── index.html            # Native Premiere Pro styled panel interface
├── styles.css            # Premiere Pro dark theme design tokens & responsive styles
├── index.js              # Main application controller & event wiring
│
├── src/
│   ├── premiere.js       # Core host detection & active project bridge
│   ├── sequence.js       # Sequence querying & aspect ratio creation
│   ├── timeline.js       # Playhead position & marker transaction logic
│   └── utils.js          # Timecode conversion, logger, & UI toast notifications
│
├── assets/
│   └── icons/
│       ├── icon-23.png   # Panel icon (standard resolution)
│       ├── icon-23@2x.png# Panel icon (Retina / High-DPI)
│       └── icon.png      # Master 128x128 brand icon
│
└── README.md             # Complete documentation and setup guide
```

---

## ⚙️ Premiere Pro UXP API Architecture Notes

Premiere Pro UXP uses an asynchronous, transaction-based object model:

1. **Host Module**:
   ```javascript
   const ppro = require('premierepro');
   ```

2. **Project & Sequence Access**:
   ```javascript
   const project = await ppro.Project.getActiveProject();
   const sequence = await project.getActiveSequence();
   ```

3. **Time Representation (`TickTime`)**:
   Premiere Pro measures timeline time in **ticks** (`254,016,000,000` ticks = 1 second) or seconds wrapped in a `TickTime` object.
   ```javascript
   const playheadTickTime = await sequence.getPlayerPosition();
   console.log('Seconds:', playheadTickTime.seconds);
   ```

4. **Transactions and Undo History (`lockedAccess`)**:
   Timeline modifications (such as adding markers or setting sequence settings) generate `Action` objects that are committed using `project.lockedAccess` and `project.executeTransaction`:
   ```javascript
   const markers = ppro.Markers.getMarkers(sequence);
   const markerAction = markers.createAddMarkerAction(
     "Marker Name",
     "Comment",
     playheadTickTime,
     zeroDuration,
     "Comment text"
   );

   await project.lockedAccess(async () => {
     await project.executeTransaction((compoundAction) => {
       compoundAction.addAction(markerAction);
     }, "Add Marker");
   });
   ```

---

## 🔮 How to Add New Tools in Phase 2

When you are ready to expand the toolbox:

1. **Add new UI control in `index.html`**:
   Add a button or card item under the relevant section.
2. **Implement API logic in dedicated `src/` module**:
   - Audio / Silence cutting: `src/audio.js` or `src/timeline.js`
   - Captions: `src/captions.js`
   - Frame Exporting: `src/export.js`
3. **Wire event in `index.js`**:
   Connect the button `click` listener to your module function using `async/await`.
4. **Reload via UXP Developer Tool** (`Ctrl+R`) to test immediately.
