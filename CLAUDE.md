# CLAUDE.md — Prompt Vault

This file provides guidance for AI assistants working in this repository.

## Project Overview

**Prompt Vault** is a full-stack web application for managing, organizing, and sharing AI prompts. It features a three-pane glassmorphic UI with drag-and-drop reordering, category management, star ratings, search/filter, clipboard copy, and Excel export.

**Stack:** Next.js (App Router) · TypeScript · Prisma ORM · SQLite · dnd-kit · xlsx

---

## Repository Structure

```
prompt-vault/
├── prisma/
│   ├── schema.prisma        # Database models (Category, Prompt)
│   ├── seed.ts              # Seed script (TypeScript)
│   └── dev.db               # SQLite database file
├── public/                  # Static SVG assets
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── categories/route.ts      # GET all, POST create
│   │   │   ├── export/route.ts          # GET → Excel download
│   │   │   ├── prompts/route.ts         # GET (search/filter), POST create
│   │   │   ├── prompts/[id]/route.ts    # PUT update, DELETE
│   │   │   ├── prompts/reorder/route.ts # PUT batch reorder
│   │   │   └── seed/route.ts            # GET → seed default categories
│   │   ├── globals.css      # Global styles + design system
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Entry point — renders <PromptDashboard />
│   ├── components/
│   │   ├── PromptDashboard.tsx  # Main orchestrator (state, layout, D&D)
│   │   ├── PromptCard.tsx       # Individual prompt card
│   │   ├── PromptModal.tsx      # Create/edit modal form
│   │   ├── Sidebar.tsx          # Category nav + search + export
│   │   ├── SortableItem.tsx     # dnd-kit sortable wrapper
│   │   └── Icons.tsx            # SVG icon components
│   └── lib/
│       ├── prisma.ts        # Prisma client singleton
│       └── backup.ts        # Markdown file backup utility
├── idea.md                  # Original product vision/requirements
├── next.config.ts           # Minimal Next.js config
├── tsconfig.json            # TypeScript config (strict, path alias @/*)
├── eslint.config.mjs        # ESLint with Next.js core-web-vitals
└── package.json
```

---

## Development Commands

```bash
# Start development server (localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint
npm run lint

# Seed the database (run once after first clone)
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts

# Or trigger via API (in browser / curl after dev server is running)
curl http://localhost:3000/api/seed
```

> There is no `.env.example`. The database URL is defined in `prisma/schema.prisma` and defaults to `file:./dev.db`.

---

## Database

**ORM:** Prisma 5 with SQLite (`prisma/dev.db`)

### Models

**Category**
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| name | String | Unique |
| color | String? | Hex color for UI badge |
| prompts | Prompt[] | Relation |

**Prompt**
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| title | String | |
| content | String | The prompt text |
| model | String | e.g. "GPT-4o", "Claude 3.5" |
| environment | String | e.g. "ChatGPT", "API" |
| goodFor | String? | Comma-separated use-case tags |
| description | String? | Notes / personal context |
| rating | Int | 0–5 stars, default 0 |
| order | Float | Sort order, default 0 |
| categoryId | String? | FK → Category |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto-updated |

### Common Prisma Commands

```bash
npx prisma studio          # GUI for the database
npx prisma db push         # Push schema changes without migration
npx prisma generate        # Regenerate Prisma client after schema change
npx prisma migrate dev     # Create and apply a new migration
```

After changing `prisma/schema.prisma`, always run `npx prisma generate`.

---

## API Routes

All routes live under `src/app/api/` and use Next.js Route Handlers (App Router).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prompts` | List prompts. Query: `search`, `category`, `rating` |
| POST | `/api/prompts` | Create a prompt |
| PUT | `/api/prompts/[id]` | Update a prompt |
| DELETE | `/api/prompts/[id]` | Delete a prompt |
| PUT | `/api/prompts/reorder` | Batch update `order` field (uses transaction) |
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create a category |
| GET | `/api/export` | Download all prompts as `.xlsx` |
| GET | `/api/seed` | Seed default categories |

### Data Fetching Convention

All client-side fetches use `{ cache: 'no-store' }` to ensure fresh data:

```ts
const res = await fetch('/api/prompts', { cache: 'no-store' });
```

---

## Component Architecture

State is managed locally in `PromptDashboard.tsx` via React `useState` / `useEffect`. There is no external state library.

**Data flow:**
```
User interaction
  → PromptDashboard (state owner)
    → fetch() call to API route
      → Prisma query to SQLite
    → setState() to update UI
      → child components re-render via props
```

**Key PromptDashboard state:**
- `prompts` — full prompt list
- `categories` — full category list
- `selectedCategory` — current sidebar filter
- `selectedPrompt` — prompt shown in right pane
- `searchQuery` — search bar value
- `ratingFilter` — star filter value

**Prop drilling** is used throughout — no context or global store.

---

## Design System

The design follows a **glassmorphism / dark-mode** aesthetic defined in `src/app/globals.css`.

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.glass-panel` | Frosted glass panel (24px blur) — sidebar, middle pane |
| `.glass-card` | Lighter glass card (8px blur) — prompt cards |
| `.btn-primary` | Blue/indigo gradient button |
| `.btn-glass` | Translucent glass button with hover state |
| `.input-glass` | Glassmorphic form input |
| `.pill` | Small badge / tag |

### Color Palette (CSS variables in `:root`)

| Variable | Value | Use |
|----------|-------|-----|
| `--bg-primary` | `#020617` | App background |
| `--bg-secondary` | `#0f172a` | Panel backgrounds |
| `--text-primary` | `#f8fafc` | Primary text |
| `--accent-blue` | `#3b82f6` | Primary accent |
| `--accent-indigo` | `#6366f1` | Secondary accent |

### Layout

Three-pane layout (all within `PromptDashboard`):
1. **Sidebar** — 300px fixed, category list + search + export
2. **Middle pane** — 420px fixed, scrollable prompt card list
3. **Right pane** — `flex: 1`, selected prompt detail/edit view

---

## Drag & Drop

Uses `@dnd-kit/core` and `@dnd-kit/sortable`.

- **Sensor:** `PointerSensor` with 8px activation distance, `KeyboardSensor`
- **Collision:** `closestCenter`
- **On drop:** calls `/api/prompts/reorder` with updated `order` values
- **Moving between categories:** dropping a card over a category pill in the sidebar changes `categoryId`

---

## Backup Utility

`src/lib/backup.ts` exports `generateMarkdownBackup(prompt)` which writes a `.md` file to `/prompts_backup/` directory on the server filesystem. This is called on create and update. It is a server-side-only utility.

---

## Icons

All icons are inline SVG components in `src/components/Icons.tsx`:

`CopyIcon`, `CheckIcon`, `PlusIcon`, `SearchIcon`, `StarIcon`, `TrashIcon`, `EditIcon`, `DownloadIcon`

Usage:
```tsx
import { CopyIcon } from '@/components/Icons';
<CopyIcon className="w-4 h-4" />
```

---

## TypeScript Conventions

- `strict: true` is enabled in `tsconfig.json`
- Path alias `@/*` maps to `src/*` — use this for all internal imports
- Avoid `any` — use proper types for Prisma models, API responses, and component props
- API route handlers use `NextRequest` / `NextResponse` from `next/server`

---

## Coding Conventions

- **No external state library** — keep state in `PromptDashboard` with `useState`
- **No CSS modules in new components** — use `globals.css` classes or inline styles
- **Fetch with `cache: 'no-store'`** for all client-side data fetching
- **Prisma transactions** for any batch database operation
- **Component files** use PascalCase (`PromptCard.tsx`)
- **API route files** are always `route.ts` inside named directories
- **Prisma client** must be imported from `@/lib/prisma` (singleton), never instantiated directly

---

## Common Pitfalls

1. **Prisma client not regenerated** — after any `schema.prisma` change, run `npx prisma generate`
2. **Missing seed data** — if categories don't appear, hit `/api/seed` or run the seed script
3. **Database path** — `dev.db` is at `prisma/dev.db`; the Prisma schema references it as `file:./dev.db` relative to the `prisma/` directory
4. **Server-only utilities** — `src/lib/backup.ts` and `src/lib/prisma.ts` are Node.js only; never import them in client components
5. **Order field** — use `Float` not `Int` for the `order` field to allow fractional ordering without bulk updates

---

## No Test Suite

There are currently no automated tests. When adding features, verify behavior manually via the dev server.

---

## No CI/CD

No GitHub Actions or other CI/CD configuration exists. Deployments are manual.
