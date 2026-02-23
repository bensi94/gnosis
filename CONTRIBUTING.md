# Contributing to Gnosis

## Prerequisites

Install these two tools (everything else is handled by devbox):

- [devbox](https://www.jetify.com/docs/devbox/installing_devbox/)
- [direnv](https://direnv.net/docs/installation.html)

## Getting started

```bash
git clone https://github.com/oddur/gnosis.git
cd gnosis
direnv allow   # one-time — activates devbox automatically on cd
task setup     # installs npm deps + pre-commit hooks
```

After this, every time you `cd` into the repo, devbox activates and puts the correct versions of Node, task, pre-commit, and trufflehog on your PATH.

## What devbox provides

| Tool       | Version | Purpose                               |
| ---------- | ------- | ------------------------------------- |
| Node.js    | 20.x    | Matches Electron 34's bundled Node    |
| go-task    | latest  | Runs `Taskfile.yml` commands          |
| pre-commit | latest  | Git hook framework                    |
| trufflehog | latest  | Secret detection (used by pre-commit) |

## Available tasks

Run `task --list` to see all tasks. Key ones:

```
task setup          # Install deps + pre-commit hooks
task dev            # Start Electron dev server
task lint           # Run ESLint
task lint:fix       # Run ESLint with auto-fix
task format         # Format code with Prettier
task format:check   # Check formatting
task package        # Package the app
task make           # Build distributable
```

## Pre-commit hooks

Hooks run automatically on `git commit`. They include:

- **ESLint** — lints and auto-fixes JS/TS files
- **Prettier** — formats code on commit
- **TruffleHog** — blocks commits containing secrets
- **Trailing whitespace / end-of-file fixer** — enforces clean files
- **check-json / check-yaml** — validates config files
- **check-added-large-files** — prevents files over 1MB

To run all hooks manually:

```bash
task pre-commit:run
```

## Code style

- ESLint and Prettier handle formatting — don't worry about it manually, pre-commit fixes it on commit
- If your commit fails due to a hook, check the output — most hooks auto-fix and you just need to `git add` the fixed files and commit again
