# PR Review Guide

AI-guided code review. Paste a GitHub PR URL and get a slide-based walkthrough of the changes in dependency order, with narrative explanations for each group.

## Setup

```bash
# Install dependencies (already done if you cloned this)
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and add your GITHUB_TOKEN and ANTHROPIC_API_KEY

# Run
npm run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Yes | GitHub personal access token with `repo` scope |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `ANTHROPIC_MODEL` | No | Set to `sonnet` to use claude-sonnet-4-6 instead of the default claude-opus-4-6 |

## How it works

1. Paste a GitHub PR URL on the home page
2. The app fetches the PR diff, changed files, and surrounding codebase context via the GitHub API
3. Claude analyzes the changes and produces a structured review: ordered slides grouped by logical dependency
4. Navigate slides with Prev/Next buttons or arrow keys
5. Each slide shows: type, title, narrative (why it changed), what to check, and syntax-highlighted diffs

## From scratch setup

```bash
# Create project
npx create-next-app@latest pr-review-guide --typescript --tailwind --app

# Install shadcn (select dark theme, zinc color when prompted)
npx shadcn@latest init

# Add required shadcn components
npx shadcn@latest add button card badge separator progress skeleton alert tooltip

# Install other deps
npm install @octokit/rest @anthropic-ai/sdk shiki

# Configure
cp .env.example .env.local
# Add GITHUB_TOKEN and ANTHROPIC_API_KEY to .env.local

# Run
npm run dev
```
