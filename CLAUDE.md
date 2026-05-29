# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DataDev Agent — a CLI AI assistant for data engineers. Generates Iceberg DDL, Spark SQL, ClickHouse configurations, and performs security scans through natural language conversation. Built with TypeScript, Anthropic SDK, and a REPL-driven architecture.

## Commands

```bash
npm run dev          # Start REPL (uses tsx, no build needed)
npm run build        # TypeScript compile → dist/
npm test             # Run all tests (vitest)
npx vitest run <path> # Run single test file
```

No lint script is configured yet. TypeScript strict mode is on (`tsconfig.json`).

## Architecture

REPL → Planner → Executor → Memory pipeline:

1. **REPL** (`src/cli/repl.ts`) — entry point. Reads user input, dispatches to `/sql`, `/security`, `/stats`, or general executor. Uses `readline` for terminal I/O.
2. **Planner** (`src/agent/planner.ts`) — sends user request + relevant knowledge to LLM, parses JSON plan from response. System prompt defines available actions.
3. **Executor** (`src/agent/executor.ts`) — executes plan steps by calling tool generators. Writes output files via `FileWriter` to cwd.
4. **Memory** (`src/agent/memory.ts`) — holds project context (data sources, tables) and delegates knowledge retrieval to `KnowledgeLoader`.
5. **LLM Provider** (`src/llm/`) — abstraction over Anthropic/OpenAI/local. `AnthropicProvider` is the only implemented provider. Factory in `provider.ts`.

Supporting modules:
- `src/config/` — YAML config loading with key normalization (snake_case → camelCase)
- `src/knowledge/loader.ts` — loads templates from `knowledge/` directory, simple text search
- `src/tools/sql/generator.ts` — generates Iceberg/ClickHouse DDL and quality check SQL
- `src/tools/security/scanner.ts` — regex-based PII detection, generates masking SQL
- `src/tools/file/` — read/write/scan with path traversal protection (sandboxed to cwd)
- `src/agent/telemetry.ts` — JSONL-based usage tracking under `~/.datadev-agent/telemetry/`
- `src/agent/session.ts` — conversation history, persisted to `~/.datadev-agent/sessions/`

## Key Patterns

- All tool classes are instantiated inline (no DI container). `FileWriter` takes an optional `allowedBase` for path sandboxing.
- Knowledge templates are plain SQL/MD/JSON files in `knowledge/`. Adding a new template = adding a file.
- MCP client exists (`src/tools/mcp/client.ts`) but is not wired into the REPL/Executor yet.
- Tests use vitest with `describe/it` blocks. Tests for file operations use `/tmp/` directories. Session/telemetry tests accept a custom directory path to avoid polluting `~/.datadev-agent/`.

## Configuration

`datadev-config.yaml` in cwd or `~/.datadev-agent/config.yaml`. Key fields: `llm.provider`, `llm.apiKey`, `llm.model`, `security.sensitivePatternsPath`, `knowledge_path`. Paths with `~/` are expanded to home directory.
