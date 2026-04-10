# hello-statusline

A minimal Claude Code statusLine plugin in ~100 lines of TypeScript. Zero dependencies.

This is the companion project for the **Dissecting Claude HUD** article series — a beginner-friendly walkthrough of how Claude Code plugins work under the hood.

## What it does

Displays a two-line status bar in your Claude Code terminal:

```
[Opus]
Context █████░░░░░ 45% │ $0.42
```

- **Model name** — which model you're using
- **Context bar** — color-coded progress bar (green → yellow → red)
- **Cost** — session cost (when available)

## Quick start

```bash
git clone https://github.com/AgenticFish/hello-statusline.git
cd hello-statusline
npm install && npm run build
```

Test it:

```bash
npm test
```

You should see colored output like:

```
[Opus]
Context █████████░ 45% │ $0.42
```

## Use it as your Claude Code statusLine

Add this to your `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /full/path/to/hello-statusline/dist/index.js"
  }
}
```

Replace `/full/path/to` with the actual path. Restart Claude Code, and the status bar appears.

## How it works

The entire plugin follows a simple cycle that runs every ~300ms:

```
Claude Code → stdin (JSON) → hello-statusline → stdout (colored text) → terminal
```

1. **Read**: Claude Code pipes a JSON payload to stdin containing model info, context usage, and cost
2. **Process**: Parse the JSON, calculate context percentage, pick colors based on thresholds
3. **Render**: Output ANSI-colored text to stdout
4. **Exit**: The process exits. Claude Code launches it again ~300ms later.

No persistent state. No background process. No dependencies.

## Project structure

```
hello-statusline/
├── src/
│   └── index.ts          ← The entire plugin (~100 lines)
├── dist/                  ← Compiled JS (after npm run build)
├── package.json
├── tsconfig.json
└── README.md
```

## Learn more

This project is intentionally minimal. To see a full-featured statusLine plugin with tool tracking, agent status, task progress, caching, and more, check out [Claude HUD](https://github.com/jarrodwatts/claude-hud).

## License

MIT
