# Gnosis

We've gotten fast at writing code. Reviewing it hasn't kept up.

Pull requests are still reviewed the same way they always have been — scrolling through a list of file diffs in whatever order GitHub decides to show them, with no grouping, no context, and no sense of which changes depend on which. It works, but it's slow and it's easy to miss things.

Gnosis is an experiment in changing that. Paste a PR URL and it reads the diff, groups related changes together, and presents them as an ordered slideshow — foundation changes first, then the features built on top, then tests and config. Each slide has a short explanation of *why* the change is there, the relevant diff, and optionally a diagram. The goal is to walk the reviewer through the change the way the author understands it, not the way the filesystem happens to order it.

It runs locally and uses Claude Code under the hood. Possibly Codex later.

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

## Usage

1. Paste a GitHub PR URL
2. Pick a model (Opus 4.6 or Sonnet 4.6)
3. Optionally enable **Extended thinking** for more thorough analysis (slower)
4. Optionally add instructions — e.g. *focus on security*, *explain the auth flow*
5. Hit **Generate Review**

Navigate slides with **← →** or the Prev/Next buttons. Drag the divider between the narrative and diff panels to resize.

Past reviews are saved locally and shown on the home screen — click any to reload without re-generating.

## Screenshots

<img width="1222" height="1052" alt="image" src="https://github.com/user-attachments/assets/6f45cf71-bbeb-49d3-aefd-62fdb0b554fb" />

<img width="1224" height="1049" alt="image" src="https://github.com/user-attachments/assets/3bafb7f5-8b18-4349-801d-d0cf79519074" />

<img width="1219" height="1050" alt="image" src="https://github.com/user-attachments/assets/686b0b3a-2f11-467b-9b6c-b84c69c50b91" />


## Development

```bash
git clone https://github.com/oddur/gnosis.git
cd gnosis
npm install
npm start
```

## Build

```bash
npm run make      # produces a distributable in out/
```
