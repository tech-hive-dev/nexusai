/**
 * Returns the base API URL for the current environment.
 * Called lazily (not at module load) to avoid SSR/window issues.
 *
 * Priority:
 *  1. NEXT_PUBLIC_API_URL env var (set in .env.local or deployment)
 *  2. Empty string → uses Vercel rewrites (relative /api path) in production
 *
 * For local dev WITHOUT .env.local, set NEXT_PUBLIC_API_URL=http://localhost:8000
 */
export const getApiUrl = (): string => {
    const env = process.env.NEXT_PUBLIC_API_URL;
    if (env && env.length > 3) {
        return env;
    }
    // On Vercel/production: use relative path so rewrites handle routing
    // On localhost without env var: return empty string and let fetch fail with a clear error
    return "";
};

/**
 * Static export for backwards-compatibility with imports like `import { API_URL } from "@/utils/api"`.
 * NOTE: Always prefer calling getApiUrl() directly in components to get the runtime value.
 */
export const API_URL = getApiUrl();
