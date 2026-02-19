# Gnosis

AI-guided code review. Paste a GitHub PR URL and get a slide-based walkthrough of the changes — ordered by dependency, with narrative explanations, syntax-highlighted diffs, and optional diagrams.

Built with Electron + Vite. No server to start.

## Requirements

- [Claude Code CLI](https://claude.ai/code) — installed and authenticated (`claude auth`)
- Node.js 20+

## Setup

```bash
git clone https://github.com/oddur/gnosis.git
cd gnosis
npm install
npm start
```

On first launch, enter your GitHub personal access token in the settings field. It's stored locally in your OS user data directory. Alternatively, set `GITHUB_TOKEN` in your environment — it takes precedence.

## Usage

1. Paste a GitHub PR URL
2. Pick a model (Opus 4.6 for best quality, Sonnet 4.6 for speed)
3. Optionally add reviewer instructions — e.g. *focus on security*, *explain the auth flow*
4. Hit **Generate Review**

The app fetches the PR diff and file contents via the GitHub API, builds a context package, and sends it to Claude via the Claude CLI. Claude returns an ordered set of slides grouped by logical dependency.

Navigate with **← →** arrow keys or the Prev/Next buttons. Drag the handle between the narrative and diff panels to resize.

Past reviews are saved automatically and shown on the home screen — click any entry to reload it without re-generating.

## macOS: "app is damaged" warning

The app is not code-signed. macOS Gatekeeper will block apps downloaded from the internet. Run this once after unzipping:

```bash
xattr -cr /Applications/Gnosis.app
```

Then double-click to open normally.

## GitHub Token

Create a token at [github.com/settings/tokens](https://github.com/settings/tokens) with `repo` read access (or `public_repo` if you only review public repositories).

## Build

```bash
npm run make      # produces a distributable in out/
```
