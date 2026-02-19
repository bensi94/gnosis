# Gnosis

AI-guided code review. Paste a GitHub PR URL and get a slide-based walkthrough of the changes — ordered by dependency, with narrative explanations, syntax-highlighted diffs, and optional diagrams.

Built with Electron + Vite. No server to start.

## Requirements

- [Claude Code CLI](https://claude.ai/code) — installed and authenticated (`claude auth`)
- Node.js 20+

## Install

```bash
brew tap oddur/gnosis
brew install --cask gnosis
```

Or download manually from [GitHub Releases](https://github.com/oddur/gnosis/releases). The app is not code-signed — macOS will block it on first launch. After moving to `/Applications`, run:

```bash
xattr -cr /Applications/Gnosis.app
```

On first launch, click **Connect GitHub** to authenticate via OAuth. Alternatively, set `GITHUB_TOKEN` in your environment — it takes precedence over OAuth.

## Development

```bash
git clone https://github.com/oddur/gnosis.git
cd gnosis
npm install
npm start
```

## Usage

1. Paste a GitHub PR URL
2. Pick a model (Opus 4.6 for best quality, Sonnet 4.6 for speed)
3. Optionally enable **Extended thinking** for deeper reasoning on complex PRs (slower)
4. Optionally add reviewer instructions — e.g. *focus on security*, *explain the auth flow*
5. Hit **Generate Review**

The app fetches the PR diff and file contents via the GitHub API, builds a context package, and sends it to Claude via the Claude CLI. Claude returns an ordered set of slides grouped by logical dependency.

Navigate with **← →** arrow keys or the Prev/Next buttons. Drag the handle between the narrative and diff panels to resize.

Past reviews are saved automatically and shown on the home screen — click any entry to reload it without re-generating.

## Build

```bash
npm run make      # produces a distributable in out/
```
