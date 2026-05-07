# CLAUDE.md — Prompt Vault

This file provides guidance for AI assistants (Claude, Copilot, etc.) working in this codebase.

---

## Project Overview

**Prompt Vault** is a single-user web application for storing, organizing, and managing AI prompts. It provides a glassmorphic dark-mode UI with a 3-pane layout, drag-and-drop reordering, inline editing, and data export capabilities.

**Tech Stack:**
- **Frontend/Backend**: Next.js 16 (App Router), React 19, TypeScript 5
- **Database**: SQLite via Prisma ORM
- **Drag-and-drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **Export**: `xlsx` (Excel), markdown file backup
- **Styling**: Vanilla CSS with CSS variables (no Tailwind)

---

## Repository Structure

```
src/
  app/
    api/
      prompts/
        route.ts          # GET (list/filter), POST (create + backup)
        [id]/route.ts     # PUT (update + backup), DELETE
        reorder/route.ts  # PUT (batch reorder/move, uses transaction)
      categories/
        route.ts          # GET (all), POST (create)
      export/route.ts     # GET → XLSX download
      seed/route.ts       # GET → initialize 7 default categories
    layout.tsx            # Root layout (Inter font, "Prompt Database Vault" title)
    page.tsx              # Entry point — renders <PromptDashboard />
    globals.css           # Design system: CSS variables, utility classes
    page.module.css       # Unused Next.js boilerplate — do not touch
  components/
    PromptDashboard.tsx   # Main shell: state, data fetching, 3-pane layout
    PromptCard.tsx        # Compact list item; exports Prompt/Category types
    PromptModal.tsx       # Create/edit form modal
    Sidebar.tsx           # Category filter + search + Excel export link
    SortableItem.tsx      # @dnd-kit drag wrapper for list items
    Icons.tsx             # All SVG icons as React components
  lib/
    prisma.ts             # Prisma client singleton (dev hot-reload safe)
    backup.ts             # savePromptToMarkdown() — writes .md backup on save
prisma/
  schema.prisma           # Data models: Category, Prompt
  seed.ts                 # Seeds 4 default categories (ts-node)
  dev.db                  # SQLite database file (tracked for dev convenience)
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
npx prisma db seed             # Seed 4 default categories via prisma/seed.ts
npx prisma migrate dev         # Create and apply a migration
```

There is no test suite. Verification is manual via the browser.

---

## API Reference

All routes are in `src/app/api/`. Every route exports `export const dynamic = 'force-dynamic'` to disable caching.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/prompts` | List prompts. Query params: `q` (search), `categoryId`, `rating` |
| POST | `/api/prompts` | Create prompt; auto-sets `order = max + 1`; triggers backup |
| PUT | `/api/prompts/[id]` | Update prompt; triggers `savePromptToMarkdown()` backup |
| DELETE | `/api/prompts/[id]` | Delete prompt |
| PUT | `/api/prompts/reorder` | Batch reorder/move; body: `{ prompts: [{id, order, categoryId?}] }` |
| GET | `/api/categories` | List all categories (ordered by name ASC) |
| POST | `/api/categories` | Create category; body: `{ name, color }` |
| GET | `/api/export` | Download all prompts as `.xlsx` (sorted by order, then updatedAt) |
| GET | `/api/seed` | Initialize 7 default categories (idempotent) |

**Note:** `GET /api/prompts` returns prompts sorted by `order ASC`, then `updatedAt DESC`, with the `category` relation included.

---

## Key Conventions

### TypeScript

- Strict mode is enabled. Avoid `any`; use proper interfaces.
- Shared types (`Prompt`, `Category`) are defined and exported from `src/components/PromptCard.tsx`. Import from there, not from Prisma client types.
- Path alias `@/*` maps to `src/*`.

### CSS / Styling

- **No Tailwind.** All styles are in `src/app/globals.css` using CSS custom properties.
- The design system uses these CSS variables (defined in `:root`):

**Backgrounds:**
```css
--bg-primary: #020617
--bg-secondary: #0f172a
--bg-glass: rgba(15, 23, 42, 0.6)
--bg-glass-hover: rgba(30, 41, 59, 0.8)
```

**Typography:**
```css
--text-primary: #f8fafc
--text-secondary: #94a3b8
--text-muted: #475569
```

**Accent / Interactive:**
```css
--accent-primary: #3b82f6
--accent-secondary: #6366f1
--accent-glow: rgba(59, 130, 246, 0.4)
```

**Borders, Radius, Shadow, Transition:**
```css
--border-glass: rgba(255, 255, 255, 0.08)
--border-glass-strong: rgba(255, 255, 255, 0.15)
--radius-sm: 0.5rem  --radius-md: 0.75rem  --radius-lg: 1.25rem  --radius-xl: 2rem
--shadow-glass: 0 10px 40px -10px rgba(0, 0, 0, 0.8)
--shadow-glow: 0 0 25px 0 var(--accent-glow)
--transition-fast: 0.1s ease-out
--transition-normal: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

- **Utility classes to reuse:**
  - Layout: `.app-container`, `.sidebar` (300px), `.main-content`, `.middle-pane` (420px), `.right-pane`
  - Cards: `.glass-panel` (24px blur), `.glass-card` (8px blur + hover), `.compact-card`, `.compact-card.selected`
  - Buttons: `.btn`, `.btn-primary`, `.btn-glass`
  - Inputs: `.input-glass`
  - Badges: `.pill`, `.pill-accent`
  - Animation: `.animate-fade-in`, `.dragging`
- Glassmorphism is achieved with `backdrop-filter: blur(...)` + semi-transparent backgrounds.
- Do not use `page.module.css` — it is boilerplate and unused.

### Component Patterns

- All components are functional with React hooks.
- State and data fetching live primarily in `PromptDashboard.tsx`. Pass data down as props.
- Do not introduce global state libraries (Redux, Zustand) — the current `useState`/`useEffect` approach matches the complexity level.
- For drag-and-drop changes: reordering is optimistic (UI updates immediately, then `PUT /api/prompts/reorder` is called).
- `PromptModal`'s `onSave` callback currently uses `any` for the prompt data parameter — keep consistent with existing pattern rather than changing it.

### Icons

All icons live in `src/components/Icons.tsx` as SVG React components. Use them for any new icon needs rather than importing an icon library. Exported components:
`CopyIcon`, `CheckIcon`, `PlusIcon`, `SearchIcon`, `StarIcon` (accepts `filled?: boolean`), `TrashIcon`, `EditIcon`, `DownloadIcon`

### Database / Prisma

- Use the singleton client from `src/lib/prisma.ts`, not a raw `new PrismaClient()`.
- Bulk updates use `prisma.$transaction([...])` to avoid partial state.
- The `order` field is a `Float` to support fractional values between items (insertion sort pattern).
- `dev.db` is committed to the repo for convenience in development. Do not commit sensitive data.

### Backup System

- `src/lib/backup.ts` exports `savePromptToMarkdown(prompt)`.
- It is called automatically on **both** `POST /api/prompts` (create) and `PUT /api/prompts/[id]` (update).
- Backups are written to `prompts_backup/<sanitized_title>_<first_8_id_chars>.md`.
- Each file has YAML frontmatter (title, model, environment, goodFor, rating, categoryId, updatedAt) and the prompt content in a markdown code block.

### Default Categories

The `/api/seed` route creates these 7 categories (idempotent):

| Name | Color |
|------|-------|
| Coding | `#3b82f6` |
| Creative Writing | `#10b981` |
| Data Analysis | `#f59e0b` |
| Marketing & SEO | `#ec4899` |
| Productivity | `#8b5cf6` |
| Social Media | `#06b6d4` |
| General | `#64748b` |

`prisma/seed.ts` (run via `npx prisma db seed`) creates only 4: Coding, Creative Writing, Data Analysis, General.

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
- Do not add icon libraries — extend `Icons.tsx` instead.
