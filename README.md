# RepoFlow

Generate data flow diagrams from GitHub repositories. Enter a repo URL, get a visual diagram, and ask questions about the codebase in natural language.

## Features

- **Repository analysis** — Submit a GitHub URL; validates and clones (public repos, &lt;200MB)
- **Data flow diagram** — Mermaid flowchart with entry points, routes, services, and data stores
- **Code linking** — Each diagram node shows associated file paths
- **Conversational Q&A** — Ask "How does data flow?" or "What talks to the database?" with a local LLM
- **Summary** — Plain-language overview of the repo structure

## Quick Start (Docker)

**Prerequisites:** Docker and Docker Compose

```bash
git clone <this-repo>
cd RepoFlow
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

**First run:** Ollama pulls the default model (~5GB) on startup. This can take 5–10 minutes. The app will be available immediately; chat may return errors until the model download completes. Check `docker compose logs -f ollama` for pull progress.

### Options

Create a `.env` file to customize:

```bash
# Use a different model (default: deepseek-r1:8b)
OLLAMA_MODEL=llama3.2

# Use OpenAI instead of local Ollama (optional)
OPENAI_API_KEY=sk-...
```

Then run `docker compose up -d` again.

## Development

```bash
npm install
npm run dev
```

For chat, run [Ollama](https://ollama.ai) locally:

```bash
ollama pull deepseek-r1:8b
```

Or set `OPENAI_API_KEY` in `.env.local` to use OpenAI.

## Tech Stack

- Next.js 15, React 19, TypeScript
- simple-git for cloning
- Mermaid for diagrams
- Ollama (local LLM) or OpenAI for chat

## Limitations

- Public repositories only
- Repo size limit: 200MB
- Heuristic-based analysis (best-effort)
