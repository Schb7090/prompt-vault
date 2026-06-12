# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Next.js development server (http://localhost:3000)
npm run build      # Production build
npm run lint       # Run ESLint

# Database
npx prisma studio  # Open Prisma GUI
npx prisma db push # Apply schema changes to dev.db
npx prisma db seed # Seed default categories (also available at GET /api/seed)
```

There is no test suite configured.

## Architecture

**prompt-vault** is a Next.js 16 App Router application with a SQLite database (via Prisma). It's a three-pane prompt management dashboard styled with glassmorphism/dark-mode CSS.

### Layout

The UI is a fixed three-pane layout rendered entirely inside `src/components/PromptDashboard.tsx`:
- **Left (300px):** `Sidebar.tsx` — category list (droppable), search, Excel export
- **Middle (420px):** sortable prompt list using `@dnd-kit/sortable`; each item is a `SortableItem.tsx` wrapper
- **Right (flex):** selected prompt details with inline editable fields and star ratings

### Data layer

- **Schema:** `prisma/schema.prisma` — two models: `Category` (id, name, color) and `Prompt` (id, title, content, model, environment, goodFor, description, rating, order, categoryId)
- **Provider:** SQLite file at `prisma/dev.db`
- **Singleton:** `src/lib/prisma.ts` exports a global PrismaClient instance to avoid multiple connections in dev
- **Backup:** On every create/update, `src/lib/backup.ts` writes a Markdown file per prompt to `prompts_backup/` (YAML frontmatter + body)

### API routes (`src/app/api/`)

| Route | Methods | Notes |
|---|---|---|
| `/api/prompts` | GET, POST | GET supports `?q=` (searches title+content), `?categoryId=`, `?rating=`; ordered by `order ASC` then `updatedAt DESC` |
| `/api/prompts/[id]` | PUT, DELETE | Both trigger markdown backup |
| `/api/prompts/reorder` | PUT | Batch reorder via Prisma transaction; also accepts `categoryId` to move between categories |
| `/api/categories` | GET, POST | Ordered by name |
| `/api/export` | GET | Returns `.xlsx` (xlsx library) with all prompt fields |
| `/api/seed` | GET | Idempotent — creates 7 default categories only if absent |

All GET route handlers set `export const dynamic = 'force-dynamic'` to prevent caching.

### Drag-and-drop

dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) handles two behaviors:
- **Reorder within list:** `DndContext` + `SortableContext` in `PromptDashboard.tsx`
- **Move to category:** Sidebar categories are `useDroppable` targets; dropping a prompt card on a category updates its `categoryId` via `/api/prompts/reorder`

### Styling

All design tokens live in CSS custom properties in `src/app/globals.css`. Key classes: `.glass-panel`, `.glass-card`, `.input-glass`, `.pill`, `.btn-primary`, `.btn-glass`. Transitions use `--transition-normal: 0.3s cubic-bezier(0.4, 0, 0.2, 1)`.

### Path alias

`@/*` resolves to `./src/*` (configured in `tsconfig.json`).
