# Frostline

**What to plant this week, from your frost dates, with a coach note from an open-weight model running on your own machine. Then close the laptop and go outside.**

Built for the [Hacktoberfest Open-Source AI Challenge: Week 1](https://dev.to/challenges/hacktoberfest-week1-2026-10-05) (theme: *Touch Grass*).

## How it works

1. You enter today's date, your average last spring frost and first fall frost (`MM-DD`).
2. A small, deterministic planner (`public/js/planner.js`) works out which sowing, indoor-starting and transplanting windows are open now, closing within a week, or opening within two weeks.
3. The server asks a local open-weight model (**Gemma 3 via [Ollama](https://ollama.com)**) to write a short coach note about *only those tasks*.
4. You print the one-page **field card** and take paper outside. The screen is the shortest part of the experience.

The model never decides dates. The planner does, so a small model can't hallucinate a planting window. The server recomputes the plan itself from the three inputs, so the model only ever sees data Frostline produced.

## Why open matters here

- **Private by construction.** Inference runs on `localhost`. Your location is never asked for, and only three date strings are used. The server binds to `127.0.0.1` by default.
- **Free to run.** No API key, no per-request cost, no quota in the middle of a Saturday.
- **Swappable.** Set `OLLAMA_MODEL` to any model Ollama can serve and the app keeps working.
- **Degrades gracefully.** If Ollama is not running, the planner and the printable card still work. Only the coach note is skipped.

## Run it

Requirements: Node.js 20+ and [Ollama](https://ollama.com). Frostline has **no npm dependencies**; there is nothing to `npm install`.

```bash
ollama pull gemma3:4b
npm start
```

Then open <http://127.0.0.1:8787>.

| Variable       | Default                  | Purpose                         |
| -------------- | ------------------------ | ------------------------------- |
| `PORT`         | `8787`                   | Port to listen on               |
| `HOST`         | `127.0.0.1`              | Interface to bind               |
| `OLLAMA_HOST`  | `http://127.0.0.1:11434` | Where Ollama is listening       |
| `OLLAMA_MODEL` | `gemma3:4b`              | Model used for the coach note   |

Tests (Node's built-in runner, no dependencies):

```bash
npm test
```

## Layout

```
public/            static UI (plain HTML, CSS and ES modules, no build step)
  js/crops.js      crop table: windows in days relative to last/first frost
  js/planner.js    pure planning logic, shared by browser, server and tests
src/ollama.js      tiny Ollama client (chat + health check)
src/server.js      static files + /api/advice + /api/health, zero dependencies
test/              node:test suites for the planner, client and server
```

## Limits

The crop windows are rules of thumb for temperate climates. Check them against your local extension service before betting a harvest on them. Frost dates are averages, so treat a window that is "closing" as a nudge, not a deadline.

## Status

This code was written with an AI agent (Claude Code) and has not yet been executed. The test suite is included but had not been run when this was published. Run `npm test` first and open an issue if anything fails.

## License

[MIT](LICENSE)
