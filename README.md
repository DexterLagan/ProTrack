# ProTrack

A simple project tracker for managing milestones and progress. Built with Rust and Tauri v2.

![Main UI](screenshots/ProTrack-main-UI.png)

## Features

- Create projects with weighted milestones (always totaling 100%)
- Track progress automatically as milestones are completed
- Edit projects after creation: add, rename, re-weight, and delete milestones
- Click a milestone to edit its text inline; delete with the `×` confirmation dialog
- Weights auto-rebalance to 100% when milestones are added or removed
- The `+` button opens the editor with a new empty milestone focused and ready to type
- Blank milestones are discarded automatically when saving
- Copy a project's remaining milestones as a ready-to-paste coding-agent prompt
- Drag & drop to reorder projects
- Archive and restore projects
- Dark / light mode toggle (follows the OS on first launch, remembers your choice)
- Fullscreen and UI zoom keyboard shortcuts
- Responsive wrapping grid layout with per-project milestone scrolling

### New Project

![New Project](screenshots/ProTrack-new-project.png)

Create a project by giving it a title and defining milestones. Each milestone has a weight (percentage), and all weights must total 100%. As you check off milestones, the project's overall progress updates automatically.

### Editing a Project

The small `+` button next to a project's title re-opens the project editor, where existing milestones can be renamed, re-weighted, removed, or added. Milestone weights rebalance automatically so the total always equals 100%. On a project card, click a milestone's text to edit it inline, and use the `×` button to delete a milestone (with confirmation).

### Dark Mode

Use the sun/moon button in the top-right of the toolbar to switch between light and dark mode. ProTrack follows your system appearance on first launch and remembers your choice afterwards.

### Copy as Prompt

Each project header has a copy button that copies its remaining (unchecked) milestones as a plain list, ready to paste into a coding agent:

```
Here is the list of items to implement next:

- Milestone one
- Milestone two
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl`+`Cmd`+`F` (macOS) / `F11` | Toggle fullscreen |
| `Cmd`+`=` or `Cmd`+`+` | Zoom in (Shift not required) |
| `Cmd`+`-` | Zoom out |
| `Cmd`+`0` | Reset zoom |
| `Cmd`+`Q` | Quit |

### Settings

![Settings](screenshots/ProTrack-settings.png)

Manage active and archived projects from the Settings dialog (File > Settings). Archive projects to hide them from your main view, restore them later, or delete them permanently.

## Specifications

| Property | Value |
|----------|-------|
| **Framework** | Tauri v2 |
| **Backend** | Rust |
| **Frontend** | Vanilla HTML/CSS/JavaScript |
| **Window Size** | 1200×800 (min 900×600), resizable |
| **Layout** | Responsive wrapping grid; each card scrolls its milestones |
| **Data Storage** | localStorage (JSON) |
| **Theming** | Light / dark mode via CSS variables |
| **Platforms** | macOS (Apple Silicon & Intel), Windows, Linux |

### Menu Bar

- **ProTrack > About ProTrack** — Shows app info and credit
- **ProTrack > Quit ProTrack** (⌘Q / Ctrl+Q) — Exits the application
- **File > Settings...** — Opens project management dialog
- **View > Toggle Full Screen** (⌃⌘F on macOS / F11 elsewhere) — Toggles window fullscreen

## Development

```bash
npm install
npm run tauri dev
```

### Building for Production

```bash
npm run tauri build
```

This produces platform-specific binaries in `src-tauri/target/release/bundle/`.

## Version History

### v0.3.1 (2026-10-20)

- Fullscreen now works via a native **View → Toggle Full Screen** menu item
  - Bound to `Ctrl+Command+F` on macOS and `F11` elsewhere, the canonical OS shortcut
  - The previous webview-only handler could not receive this chord because macOS routes it through the app menu

### v0.3.0 (2026-10-20)

- Fullscreen shortcut (`Ctrl`+`Cmd`+`F`, `F11`) and UI zoom shortcuts (`Cmd`+`=`, `Cmd`+`-`, `Cmd`+`0`)
- Opening a project's `+` adds a focused empty milestone; `Add Milestone` focuses the new row
- Saving with blank milestones is allowed; blanks are discarded and weights rebalanced
- Copy a project's remaining milestones as a plain coding-agent prompt

### v0.2.2 (2026-10-05)

- Projects now wrap into multiple rows instead of a single scrolling row; each project scrolls its own milestone list

### v0.2.1 (2026-10-04)

- Milestone text now wraps to multiple lines instead of being truncated

### v0.2.0 (2026-09-16)

- Edit existing projects: add, rename, re-weight, and delete milestones after creation
- Inline milestone text editing (click the text; Enter/blur saves, Esc cancels)
- Per-milestone delete button with confirmation; completed milestones subtract their percentage
- Project editor lists existing milestones and keeps weights auto-balanced to 100%
- Dark / light mode toggle that follows the OS on first launch and remembers your choice

### v0.1.1 (2026-09-15)

- Custom ProTrack app icon (replaces default Tauri template icon) across all platforms

### v0.1.0 (2026-09-15)

- Initial release
- Project creation with weighted milestones (totaling 100%)
- Automatic progress tracking as milestones are completed
- Drag & drop reordering of project cards
- Archive / restore / delete projects via Settings dialog
- Menu bar: About, Quit (⌘Q), Settings
- Builds for macOS (Apple Silicon), Windows, and Linux

## License

MIT © Dexter Santucci
