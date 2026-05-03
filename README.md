# Nika Location Agent

Local-first desktop AI agent for Singapore location discovery.

## What this is

This repo starts the required stack for the take-home assignment:

- Tauri v2 shell
- React + TypeScript frontend
- Ollama chat integration
- Nominatim-backed `location_search` tool
- deck.gl map rendering with MapLibre tiles

The current implementation focuses on the core loop and the project scaffold so the app is easy to explain and extend.

## Architecture

1. The chat panel sends a user prompt into the agent loop.
2. The agent forwards the prompt to Ollama with a tool schema.
3. If the model requests `location_search`, the tool calls Nominatim.
4. The tool returns typed location records plus GeoJSON-ready geometry.
5. The map renders the results with deck.gl layers and updates the viewport.

## Model choice

The default model is `qwen2.5:14b` because it is strong at structured tool calling and works well for local reasoning on a capable machine. If the machine is memory-constrained, switch to `qwen2.5:7b` in `src/lib/ollama.ts`.

## Run locally

1. Install Ollama.
2. Pull the model:

   ```bash
   ollama pull qwen2.5:14b
   ```

3. Start Ollama locally.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Run the frontend build or dev server:

   ```bash
   npm run dev
   ```

6. When the Rust toolchain is available, run the Tauri shell from the same project.

## Current status

- The React frontend scaffold builds successfully.
- The Tauri backend files are in place, but this workspace does not currently have `cargo` installed, so the desktop shell cannot be launched here yet.
- The app still needs runtime testing against a live Ollama instance.

## Known limitations

- Streaming is not implemented yet.
- Only one tool is wired right now: `location_search`.
- Nominatim requests are made directly from the frontend, which is simple but may be tightened later if a Tauri command proxy is preferred.
- Map styling is intentionally minimal so the focus stays on the agent loop.
