# Gnosis

_Gnosis_ is an ancient Greek word for knowledge — not the surface kind, but the deep, direct understanding of something. The Gnostics used it to mean insight that comes from within, from truly comprehending a thing rather than just observing it from the outside. That's what's missing from most code reviews: you see the diff, but you don't get the understanding. Gnosis tries to close that gap — to give the reviewer not just the changes, but the story behind them.

We've gotten fast at writing code. Reviewing it hasn't kept up.

Pull requests are still reviewed the same way they always have been — scrolling through a list of file diffs in whatever order GitHub decides to show them, with no grouping, no context, and no sense of which changes depend on which. It works, but it's slow and it's easy to miss things.

Gnosis is an experiment in changing that. Paste a PR URL and it reads the diff, groups related changes together, and presents them as an ordered slideshow — foundation changes first, then the features built on top, then tests and config. Each slide has a short explanation of _why_ the change is there, the relevant diff, and optionally a diagram. The goal is to walk the reviewer through the change the way the author understands it, not the way the filesystem happens to order it.

It runs locally and uses the [Claude Code CLI](https://claude.ai/code) or [Gemini CLI](https://github.com/google-gemini/gemini-cli) under the hood.

## Features

- **Guided slideshow** — changes are grouped by theme and ordered by dependency (foundations first, then implementations, then tests and config), not by filename
- **Multi-provider** — choose between Claude (Opus, Sonnet, Haiku) and Gemini (3.1 Pro, 3 Pro, 3 Flash, 2.5 Pro, 2.5 Flash)
- **Extended thinking** — enable deeper reasoning for Claude models (slower, more thorough)
- **Custom instructions** — steer the review with free-text prompts (e.g. _focus on security_, _explain the auth flow_)
- **Inline review comments** — add comments on specific diff lines and submit directly to GitHub as an approval, request for changes, or comment
- **Signal boost** — filters out trivial changes (whitespace, import reordering, boilerplate) and focuses on design decisions, complexity, and API surface changes
- **Smart imports** — uses a fast model to detect local file imports across all languages (C#, Rust, Python, Go, etc.), giving reviewers context beyond just JS/TS `import` statements
- **PR browser** — browse your open PRs and review requests instead of pasting URLs
- **Stale review detection** — if a PR receives new commits after your review was generated, a banner shows what changed and offers to re-generate
- **Review history** — past reviews are saved locally and grouped by PR on the home screen
- **Mermaid diagrams** — slides can include architecture and flow diagrams, viewable in fullscreen
- **Risk assessment** — each review is rated low/medium/high risk based on what changed
- **Configurable CLI paths** — if the CLI isn't auto-detected (e.g. Finder/Dock launch), set the path manually in Settings
- **Code appearance** — pick your code font and syntax theme in Settings
- **Update notifications** — in-app banner when a new release is available

## Requirements

- **At least one** of the following CLIs installed and authenticated:
  - [Claude Code CLI](https://claude.ai/code) — authenticate with `claude auth`
  - [Gemini CLI](https://github.com/google-gemini/gemini-cli)
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

## Update

```bash
brew update && brew upgrade --cask gnosis
```

On first launch, click **Sign in with GitHub** to authenticate via OAuth.

## Usage

1. Paste a GitHub PR URL — or click **Browse** to pick from your open PRs and review requests
2. Choose a provider (Claude or Gemini) and model
3. Optionally enable **Extended thinking** for deeper analysis (Claude only, slower)
4. Optionally add custom instructions — e.g. _focus on security_, _explain the auth flow_
5. Hit **Generate Review**

Navigate slides with **← →** or the Prev/Next buttons. Drag the divider between the narrative and diff panels to resize.

Past reviews are saved locally and grouped by PR on the home screen — click any to reload without re-generating.

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
