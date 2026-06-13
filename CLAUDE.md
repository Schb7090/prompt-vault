# CLAUDE.md — Prompt Vault

## Project Overview

Prompt Vault is a personal AI prompt management application built with Next.js 16, React 19, TypeScript, Prisma ORM, and SQLite. It provides a three-pane dashboard for organizing, searching, and exporting AI prompts with drag-and-drop reordering, category management, star ratings, and Excel export.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Database | SQLite via Prisma ORM |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Export | xlsx library |
| Styling | Custom CSS (glassmorphism design system) |

## Directory Structure

```
src/
├── app/
│   ├── api/                    # Next.js API route handlers
│   │   ├── categories/route.ts # GET list, POST create
│   │   ├── prompts/
│   │   │   ├── route.ts        # GET list (search/filter), POST create
│   │   │   ├── [id]/route.ts   # PUT update, DELETE remove
│   │   │   └── reorder/route.ts # PUT batch reorder + category reassign
│   │   ├── export/route.ts     # GET → Excel file download
│   │   └── seed/route.ts       # GET → seed default categories
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Entry point (renders PromptDashboard)
│   └── globals.css             # Design system (CSS variables, glass classes)
├── components/
│   ├── PromptDashboard.tsx     # Main container — state, layout, all feature logic
│   ├── PromptCard.tsx          # Single prompt in list view
│   ├── PromptModal.tsx         # Create/edit dialog
│   ├── Sidebar.tsx             # Category nav + search + export button
│   ├── SortableItem.tsx        # dnd-kit drag wrapper
│   └── Icons.tsx               # SVG icon components
└── lib/
    ├── prisma.ts               # Singleton Prisma client
    └── backup.ts               # savePromptToMarkdown() — writes to /prompts_backup/
prisma/
├── schema.prisma               # DB schema (Category, Prompt models)
├── seed.ts / seed.js           # Seed script (default categories)
└── dev.db                      # SQLite database file
```

## Database Schema

**Category**: `id`, `name` (unique), `color?`, `prompts[]`

**Prompt**: `id`, `title`, `content`, `model`, `environment`, `goodFor?`, `description?`, `rating` (0–5), `order` (Float for manual sort), `categoryId?`, `createdAt`, `updatedAt`

Ordering: prompts are fetched by `order ASC, updatedAt DESC`. The `order` field is a Float to allow fractional insertion without renumbering.

## Development Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint check
npx prisma studio    # Open Prisma DB browser
npx prisma db push   # Apply schema changes to SQLite
npx prisma db seed   # Run seed script
```

No test suite is configured. Manual testing via the browser is the current approach.

## Key Conventions

### API Routes
- All routes use Next.js App Router `route.ts` pattern (`export async function GET/POST/PUT/DELETE`)
- Responses use `NextResponse.json(data)` and `NextResponse.json({ error }, { status: N })`
- PUT to `/api/prompts/[id]` calls `savePromptToMarkdown()` automatically after saving
- Batch reorder uses a Prisma `$transaction([...updateMany])` for atomicity

### Frontend State (PromptDashboard.tsx)
- All app state lives in `PromptDashboard.tsx` — prompts, categories, selected item, modal state, inline edit state, toast
- Data fetching is done via `fetch()` directly against the local API routes
- After any mutation, the affected state is refreshed by re-fetching from the API
- Drag-and-drop uses `DndContext` + `SortableContext` from dnd-kit; reorder is committed to the server on `onDragEnd`

### Styling
- Use the existing CSS variable system in `globals.css` — do not introduce Tailwind or CSS-in-JS
- Glass panel pattern: `background: var(--glass-bg); backdrop-filter: blur(20px); border: 1px solid var(--glass-border);`
- Key classes: `.glass-panel`, `.glass-card`, `.btn-primary`, `.btn-ghost`, `.input-glass`, `.pill`
- Dark-mode only — the palette is built around `#020617` (near-black) and `#0f172a`

### TypeScript
- Strict mode is enabled — avoid `any`
- Path alias `@/*` maps to `src/*`
- Target is ES2017; use standard async/await patterns

### Prisma
- Import the singleton client from `@/lib/prisma`, never instantiate `PrismaClient` directly elsewhere
- After schema changes: `npx prisma db push` (no migrations — this is a local SQLite dev DB)
- Seed file is at `prisma/seed.ts` (TypeScript), compiled to `prisma/seed.js` for runtime

### Backup
- `savePromptToMarkdown(prompt)` in `src/lib/backup.ts` writes individual `.md` files to `/prompts_backup/` with YAML front-matter
- This runs automatically on every PUT (update); it does not run on POST (create) yet

## Data Flow

```
User action (React)
  → fetch() to /api/...
    → Prisma query → SQLite dev.db
      → Response JSON
        → React state update → re-render
```

For updates: API also writes a markdown backup via `lib/backup.ts`.

## Prompt Fields Reference

| Field | Type | Notes |
|-------|------|-------|
| title | String | Required, display name |
| content | String | The full prompt text |
| model | String | e.g. "GPT-4o", "Claude 3.5 Sonnet" |
| environment | String | e.g. "ChatGPT", "API", "Cursor" |
| goodFor | String? | Use-case tag e.g. "Brainstorming" |
| description | String? | Personal notes/documentation |
| rating | Int 0–5 | Star rating, 0 = unrated |
| order | Float | Manual sort position |
| categoryId | String? | FK to Category |

## Feature Areas

- **CRUD**: Create/edit via modal (`PromptModal.tsx`); delete with confirmation
- **Inline editing**: Title and content editable directly in the detail panel
- **Search**: Full-text search across title + content (API-side, passed as query param)
- **Filtering**: By category (sidebar click) and by minimum rating
- **Drag & drop**: Reorder within category or move between categories
- **Copy to clipboard**: One-click copy of prompt content
- **Export**: Download all prompts as `.xlsx` via `/api/export`
- **Seeding**: `/api/seed` populates default categories on first run

## Environment & Deployment

- No `.env` file is required for local development — Prisma uses `file:./dev.db` directly
- The SQLite file `prisma/dev.db` is committed to the repo (development convenience)
- No external services or API keys are needed in the current setup
- For production, swap the Prisma datasource to a hosted database (e.g. PostgreSQL) and set `DATABASE_URL`

## What Does Not Exist Yet

- No authentication / user accounts
- No test suite (no Jest, Vitest, Playwright)
- No CI/CD pipeline
- No mobile-responsive layout
- No dark/light theme toggle (dark only)
- No Ollama or external LLM API integration
