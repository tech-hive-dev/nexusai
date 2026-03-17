# Onboarding Enrichment, Templates, Channels, and UX Fixes

## Summary
- Upgrade onboarding auto-discovery to enrich from website + Google Places (gated) + social, with user confirmation and easy removal.
- Fix template recommendation, persistence, and removal, including seeded knowledge cleanup.
- Make Channels actually configurable by wiring the UI to the Channels API.
- Fix embed code `apiUrl` resolution, add KB delete actions, and surface forgot-password in main + reseller login.
- Replace invalid Anthropic model IDs and make models configurable per feature.

## Implementation Changes

### 1) Auto-Discovery Enrichment (Onboarding)
- Backend:
  - Replace invalid Anthropic models in `/api/knowledge/auto-discover` with configurable model IDs (e.g., `AUTO_DISCOVER_MODEL`, `TEMPLATE_RECOMMEND_MODEL`).
  - Add a multi-source enrichment pipeline:
    - Website crawl/extraction (existing).
    - Google Places enrichment (behind `GOOGLE_PLACES_API_KEY`; if missing, skip gracefully).
    - Social enrichment (Facebook/Instagram + additional public sources; best-effort scrape + LLM extraction).
  - Add provenance metadata for each discovered item (source = website/places/social) to support cleanup.
  - Add a `knowledge_sources.source_meta` JSONB (runtime migration) to tag AI-discovered items.
- Frontend:
  - Keep current approval checkboxes, but add a clear confirmation step stating what will be saved.
  - Show source labels (Website / Google / Social) per discovered item.

### 2) Template Recommendation + Lifecycle
- Backend:
  - Fix template recommendation to use valid Anthropic model and include knowledge source names + auto-discovery summary.
  - Persist custom templates in DB (use `agent_templates` table), replacing the current in-memory store.
  - Track applied template on tenant (add `applied_template_id` or similar).
  - Implement “remove template” API that:
    - Deletes template-seeded KB items (via `source_meta.template_id`).
    - Resets persona/industry to prior values or blank.
- Frontend:
  - Fix template list fetch to include `Authorization` header (currently missing).
  - Show recommended template after onboarding auto-discovery.
  - Add “Remove Template” action (only if applied).
  - Keep “Build Custom Template” always available when no recommendation fits.

### 3) Channels Integration
- Backend:
  - Use `/api/channels` as the source of truth for integrations.
  - Support create/update/list channel configs per tenant (already exists).
- Frontend:
  - Update Channels UI to create/update channels through `/api/channels` instead of `tenant/settings`.
  - Show “connected” status and last configured time based on channel records.
  - Keep widget + API channels as active; other channels allow config and activation toggles.

### 4) Embed Code `apiUrl` Fix
- Backend:
  - Generate embed `apiUrl` from request host (recommended), with optional env fallback.
  - Remove reliance on default `http://localhost:8000`.
- Frontend:
  - No changes needed beyond consuming the updated API response.

### 5) Knowledge Base Deletion
- Backend:
  - Ensure deleting a source removes related chunks (already cascades via FK).
  - If a file was uploaded, optionally remove from storage when possible (best-effort).
- Frontend:
  - Add a delete action per KB source with confirmation.

### 6) Forgot Password
- Frontend:
  - Ensure “Forgot password?” is visible on main login and reseller login.
- Backend:
  - Confirm existing `/api/auth/forgot-password` and `/api/auth/reset-password` flow works; extend to reseller if needed.

## Public API / Interface Changes
- New/updated env vars:
  - `AUTO_DISCOVER_MODEL`, `TEMPLATE_RECOMMEND_MODEL`, `GOOGLE_PLACES_API_KEY`
- Templates API: add “remove applied template” endpoint.
- Knowledge: add `source_meta` in `knowledge_sources`.

## Test Plan
- Auto-discovery:
  - Website-only flow works when no keys are set.
  - Google Places path works when key is present.
  - Social enrichment handles missing/blocked pages gracefully.
- Templates:
  - Recommendation returns valid template or null.
  - Apply + remove template updates tenant and KB correctly.
  - Custom templates persist across server restarts.
- Channels:
  - Create/update/list channels via UI.
- Embed code:
  - `apiUrl` reflects the deployed backend host.
- Knowledge base:
  - Deleting a source removes chunks and updates UI.

## Assumptions
- Google Places key not yet available, so the feature is gated and defaults to website + social only.
- Social enrichment is best-effort and non-blocking.
- “Remove template” should delete only template-seeded KB items and reset persona/industry.
