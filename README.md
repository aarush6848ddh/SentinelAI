# SentinelAI

An AI-powered code security and quality review tool. Point it at any GitHub repository, trigger a crawl, and SentinelAI will analyze every file using an LLM, detect security vulnerabilities and bugs, store findings as structured issues, and let you query them through a streaming AI chat backed by semantic search.

---

## What it does

1. **Connects to your GitHub repos** via the GitHub API. Add any public or private repo you have access to.
2. **Crawls the codebase file by file.** Each file is sent to Groq (LLaMA 3.3 70B) with a security review prompt. The LLM returns structured JSON describing issues found: title, description, severity, category, file path, and line number.
3. **Saves issues to PostgreSQL** with severity levels (critical / high / medium / low) and categories (security / bug / quality).
4. **Generates vector embeddings** for every issue using `sentence-transformers` (`all-MiniLM-L6-v2`) and stores them in `pgvector` alongside the issue data.
5. **Surfaces issues through a chat interface.** When you ask a question, the query is embedded and pgvector retrieves the most semantically relevant issues. Only those go into the LLM context. This is RAG (Retrieval-Augmented Generation) so it scales to large repos without hitting context limits.

---

## Tech stack

| Layer | Technology |
|---|---|
| API | FastAPI + Uvicorn |
| Database | PostgreSQL 15 + pgvector |
| ORM | SQLAlchemy |
| LLM | Groq (LLaMA 3.3 70B) |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Cache | Redis |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Infra | Docker Compose |

---

## Architecture

```
main.py                   FastAPI entrypoint. Enables pgvector, registers routers, configures CORS.
database.py               SQLAlchemy engine, session factory, Base, get_db() dependency.

models/
  repository.py           GitHub repo tracked in SentinelAI
  crawl_job.py            Tracks crawl status: pending / running / completed / failed
  issue.py                Security/bug/quality issue with severity, category, file path, embedding
  pull_request.py         PR model (for future webhook integration)

routers/
  repositories.py         POST /repositories/ and GET /repositories/
  crawl_jobs.py           POST /crawl-jobs/ triggers a background crawl
  issues.py               GET /issues/ with optional filters: repository_id, severity, category
  chat.py                 POST /chat/general/stream — RAG-powered streaming chat
  github.py               Proxies GitHub API calls to the frontend

tools/
  github_tool.py          get_file_tree(), get_file_content(), file filter logic
  db_tool.py              save_issues_bulk() (generates embeddings), clear_issues(), update_crawl_job()
  embedding_tool.py       generate_embedding() using sentence-transformers

agents/
  crawl_agent.py          run_crawl() orchestrator, analyze_file() per-file LLM call, map_category()

frontend/
  app/page.tsx            Single unified chat interface
  app/components/Sidebar  Repository list with live crawl status polling
```

### Crawl pipeline

```
POST /crawl-jobs/
      |
      v
crawl_agent.run_crawl()           runs in background thread
      |
      v
github_tool.get_file_tree()       fetches all file paths, skips binaries/lock files/node_modules
      |
      v
for each file:
  github_tool.get_file_content()
  analyze_file()                  sends file to Groq, parses JSON response
      |
      v
db_tool.clear_issues()            removes old issues for this repo
db_tool.save_issues_bulk()        saves new issues + generates embeddings for each one
```

### RAG chat pipeline

```
POST /chat/general/stream
      |
      v
generate_embedding(user message)  384-float vector via all-MiniLM-L6-v2
      |
      v
pgvector cosine distance search   top 5 most semantically similar issues
      |
      v
build system prompt               inject only those 5 issues as context
      |
      v
Groq streaming response           streamed back as SSE (text/event-stream)
```

---

## API endpoints

### Repositories
| Method | Endpoint | Description |
|---|---|---|
| POST | `/repositories/` | Add a GitHub repo to SentinelAI |
| GET | `/repositories/` | List all tracked repos |

### Crawl jobs
| Method | Endpoint | Description |
|---|---|---|
| POST | `/crawl-jobs/` | Trigger a crawl for a repo |
| GET | `/crawl-jobs/` | List all crawl jobs |

### Issues
| Method | Endpoint | Description |
|---|---|---|
| GET | `/issues/` | List issues. Filter by `repository_id`, `severity`, `category` |
| GET | `/issues/{id}` | Get a single issue by ID |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat/general/stream` | RAG-powered streaming chat. Returns `text/event-stream`. |

### GitHub proxy
| Method | Endpoint | Description |
|---|---|---|
| GET | `/github/repos` | List GitHub repos for the authenticated user |

---

## Running locally

### Prerequisites

- Docker and Docker Compose
- A GitHub personal access token (repo + user read scope)
- A Groq API key (free at console.groq.com)

### Setup

1. Clone the repo and create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:password@db:5432/sentinelai
GROQ_API_KEY=your_groq_key_here
GITHUB_TOKEN=your_github_token_here
```

2. Start everything:

```bash
docker-compose up --build
```

This starts four services: the FastAPI API, PostgreSQL with pgvector, Redis, and the Next.js frontend.

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

3. Open http://localhost:3000, add a repo from your sidebar, and run a crawl.

### Notes

- The first crawl will be slow on cold start because `sentence-transformers` downloads the `all-MiniLM-L6-v2` model weights (~90MB). Subsequent runs use the cached model.
- Re-running a crawl clears all previous issues for that repo and replaces them with fresh results. No duplicates.
- The pgvector extension is enabled automatically at API startup. No manual SQL required.

---

## How the chat works

The general chat uses RAG, not a naive "dump everything" approach.

When you ask a question:
1. Your message is converted into a 384-dimensional vector using `all-MiniLM-L6-v2`
2. pgvector finds the 5 stored issue embeddings with the smallest cosine distance to your query
3. Only those 5 issues are injected into the system prompt
4. Groq generates a streamed response grounded in that specific context

This means the chat scales to any number of repos and issues without hitting context limits or increasing latency linearly.

---

## File filtering

During a crawl, the following are automatically skipped:

**Directories:** `node_modules/`, `.git/`, `dist/`, `build/`, `__pycache__/`, `.next/`, `venv/`, `.venv/`

**Extensions:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.ico`, `.pdf`, `.zip`, `.tar`, `.gz`, `.whl`, `.pyc`

**Files:** `package-lock.json`, `yarn.lock`, `poetry.lock`, `Pipfile.lock`, `pnpm-lock.yaml`

---

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Use `db` as the host when running in Docker Compose. |
| `GROQ_API_KEY` | Groq API key for LLM calls during crawl and chat. (Planning to switch to Gemini in the future) |
| `GITHUB_TOKEN` | GitHub personal access token with repo and user read access. |
