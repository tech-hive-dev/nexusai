# NexusAI — Frontend Reference

## Structure
```
frontend/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── onboarding/page.tsx  # Post-registration setup
│   ├── dashboard/page.tsx   # Main shell — view switcher
│   └── reseller/            # White-label reseller portal
├── components/
│   ├── dashboard/           # Dashboard view components (one per view)
│   ├── Sidebar.tsx          # Left nav with NAV_GROUPS
│   └── ...
├── lib/
│   └── api.ts               # Axios instance with base URL + auth header
└── store/                   # Zustand stores
```

## Dashboard Views (registered in `app/dashboard/page.tsx`)
Each view is a component in `components/dashboard/`:

| View key | Component | Status |
|----------|-----------|--------|
| `overview` | `Overview.tsx` | Built — LineChart + PieChart (Recharts) |
| `conversations` | `Conversations.tsx` | Built |
| `leads` | `Leads.tsx` | Built |
| `quotes` | `Quotes.tsx` | Built |
| `broadcasts` | `Broadcasts.tsx` | Built |
| `knowledge` | `KnowledgeBase.tsx` | Built |
| `settings` | `Settings.tsx` | Built — 5 sections incl. Brand Voice, Competitor Playbook |
| `integrations` | `Integrations.tsx` | Built — registered in page.tsx |
| `reports` | `Reports.tsx` | Built |
| `channels` | `Channels.tsx` | Built — wired to `/api/channels` |
| `templates` | `Templates.tsx` | Built — apply/unapply lifecycle |
| `csat` | `CSAT.tsx` | Built |

**Known gap**: Sidebar does not have an "Integrations" nav item — the view is registered but unreachable from the UI.

## Sidebar Nav Groups (`components/Sidebar.tsx`)
```tsx
// NAV_GROUPS structure:
{ label: "MAIN", items: [overview, conversations, leads, quotes] }
{ label: "CONTENT", items: [knowledge, templates, broadcasts] }
{ label: "CONNECT", items: [channels, integrations ← MISSING NAV ITEM] }
{ label: "ANALYTICS", items: [reports, csat] }
{ label: "CONFIG", items: [settings] }
```

## Key Patterns

### Auth Token
```tsx
const token = () => localStorage.getItem("token") || "";
const headers = { Authorization: `Bearer ${token()}` };
```

### API Base URL
```tsx
const API = process.env.NEXT_PUBLIC_API_URL || "";
// Production: "" (empty) — Vercel rewrites /api/* to Railway
// Dev: "http://localhost:8000"
```

### Data Fetching
```tsx
// SWR (preferred for dashboard data)
const { data } = useSWR("/api/endpoint", fetcher);

// Direct fetch (for imperative actions)
fetch(`${API}/api/endpoint`, { headers })
```

### State Management
- Global auth/tenant state: Zustand store
- Local component state: useState/useReducer

### Common Components
- `Toggle` — animated CSS switch (built in Settings.tsx, inline)
- No external UI component library — Tailwind only

## Environment
```
NEXT_PUBLIC_API_URL=http://localhost:8000   # .env.local (dev only)
# Production: must be "" (empty string) in Vercel dashboard
```

## Build Constraints
- `useSearchParams()` must be wrapped in `<Suspense>` (Next.js App Router requirement)
- `npx tsc --noEmit` must pass before pushing
