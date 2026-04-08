# CLAUDE.md — Prompt Vault

This file provides guidance for AI assistants (Claude, Copilot, etc.) working in this codebase.

---

## Project Overview

**Prompt Vault** is a single-user web application for storing, organizing, and managing AI prompts. It provides a glassmorphic dark-mode UI with a 3-pane layout, drag-and-drop reordering, inline editing, and data export capabilities.

**Tech Stack:**
- **Frontend/Backend**: Next.js 16 (App Router), React 19, TypeScript 5
- **Database**: SQLite via Prisma ORM
- **Drag-and-drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Export**: `xlsx` (Excel), custom markdown backup
- **Styling**: Vanilla CSS with CSS variables (no Tailwind)

---

## Repository Structure

```
src/
  app/
    api/
      prompts/
        route.ts          # GET (list/filter), POST (create)
        [id]/route.ts     # PUT (update + triggers backup), DELETE
        reorder/route.ts  # PUT (batch reorder/move, uses transaction)
      categories/
        route.ts          # GET (all), POST (create)
      export/route.ts     # GET → XLSX download
      seed/route.ts       # GET → initialize default categories
    layout.tsx            # Root layout (Inter font, global meta)
    page.tsx              # Entry point — renders <PromptDashboard />
    globals.css           # Design system: CSS variables, utility classes
  components/
    PromptDashboard.tsx   # Main shell: state, data fetching, 3-pane layout
    PromptCard.tsx        # Compact list item; exports Prompt/Category types
    PromptModal.tsx       # Create/edit form modal
    Sidebar.tsx           # Category filter + search input
    SortableItem.tsx      # @dnd-kit drag wrapper for list items
    Icons.tsx             # All SVG icons as React components
  lib/
    prisma.ts             # Prisma client singleton (dev hot-reload safe)
    backup.ts             # Generates markdown backups on prompt save
prisma/
  schema.prisma           # Data models: Category, Prompt
  seed.ts                 # Seeds default categories (ts-node)
  dev.db                  # SQLite database file (tracked but not production)
```

---

## Data Models

```prisma
model Category {
  id      String   @id @default(cuid())
  name    String   @unique
  color   String?           // Hex color string, e.g. "#3b82f6"
  prompts Prompt[]
}

model Prompt {
  id          String    @id @default(cuid())
  title       String
  content     String
  model       String            // e.g. "GPT-4o", "Claude 3.5 Sonnet"
  environment String            // e.g. "ChatGPT", "API", "Claude.ai"
  goodFor     String?           // Use case or context
  description String?           // Notes/comments
  rating      Int       @default(0)   // 1–5 stars
  order       Float     @default(0)   // Fractional ordering for drag-drop
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

---

## Development Commands

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run start      # Serve production build
npm run lint       # Run ESLint

# Database
npx prisma studio              # Open Prisma GUI
npx prisma db push             # Sync schema to database
npx prisma db seed             # Seed default categories
npx prisma migrate dev         # Create and apply a migration
```

There is no test suite. Verification is manual via the browser.

---

## API Reference

All routes are in `src/app/api/`. Every route exports `export const dynamic = 'force-dynamic'` to disable caching.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/prompts` | List prompts. Query params: `q` (search), `categoryId`, `rating` |
| POST | `/api/prompts` | Create prompt |
| PUT | `/api/prompts/[id]` | Update prompt; also writes a markdown backup to `/prompts_backup/` |
| DELETE | `/api/prompts/[id]` | Delete prompt |
| PUT | `/api/prompts/reorder` | Batch reorder/move; body: `{ updates: [{id, order, categoryId}] }` |
| GET | `/api/categories` | List all categories (ordered by name) |
| POST | `/api/categories` | Create category |
| GET | `/api/export` | Download all prompts as `.xlsx` file |
| GET | `/api/seed` | Initialize default categories (idempotent) |

---

## Key Conventions

### TypeScript

- Strict mode is enabled. Avoid `any`; use proper interfaces.
- Shared types (`Prompt`, `Category`) are defined and exported from `src/components/PromptCard.tsx`. Import from there, not from Prisma client types.
- Path alias `@/*` maps to `src/*`.

### CSS / Styling

- **No Tailwind.** All styles are in `src/app/globals.css` using CSS custom properties.
- The design system uses these key CSS variables (defined in `:root`):
  - `--bg-primary` (`#020617`), `--bg-secondary`, `--bg-card` — background layers
  - `--text-primary`, `--text-secondary`, `--text-muted` — typography
  - `--accent` (`#3b82f6`), `--accent-hover` — interactive color
- Utility classes to reuse: `.glass-card`, `.btn`, `.btn-primary`, `.btn-ghost`, `.pill`, `.input-glass`
- Glassmorphism is achieved with `backdrop-filter: blur(...)` + semi-transparent backgrounds.
- Do not use `page.module.css` — it is boilerplate and unused.

### Component Patterns

- All components are functional with React hooks.
- State and data fetching live primarily in `PromptDashboard.tsx`. Pass data down as props.
- Do not introduce global state libraries (Redux, Zustand) — the current `useState`/`useEffect` approach matches the complexity level.
- For drag-and-drop changes: reordering is optimistic (UI updates immediately, then `PUT /api/prompts/reorder` is called).

### Database / Prisma

- Use the singleton client from `src/lib/prisma.ts`, not a raw `new PrismaClient()`.
- Bulk updates use `prisma.$transaction([...])` to avoid partial state.
- The `order` field is a `Float` to support fractional values between items (insertion sort pattern).
- `dev.db` is committed to the repo for convenience in development. Do not commit sensitive data.

### Backup System

- `src/lib/backup.ts` exports `generateMarkdownBackup(prompt)`.
- It is called automatically inside `PUT /api/prompts/[id]` after every successful save.
- Backups are written to `/prompts_backup/<title>.md` on the filesystem.

---

## Design Principles

- **Minimal dependencies**: prefer built-in Next.js / React APIs over adding libraries.
- **No over-engineering**: this is a single-user personal tool. Skip auth, multi-tenancy, pagination, and complex caching unless explicitly requested.
- **Preserve the aesthetic**: maintain the glassmorphism dark-mode visual language when adding UI elements.
- **Inline over modal**: prefer inline editing for small field changes; use `PromptModal` only for full create/edit flows.

---

## Things to Avoid

- Do not add Tailwind, Chakra, Material UI, or other component/CSS frameworks.
- Do not introduce a separate state management library.
- Do not change the database engine (SQLite is intentional for zero-setup local use).
- Do not add client-side routing beyond what Next.js App Router provides; this is a single-page app.
- Do not modify `page.module.css` — it is dead code left from the Next.js boilerplate.
- Do not break the `export const dynamic = 'force-dynamic'` pattern in API routes without understanding cache implications.
