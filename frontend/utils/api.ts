/**
 * Robust API URL detection with fallback to live Railway backend.
 * Prevents "Failed to fetch" errors caused by misconfigured environment variables.
 */
export const getApiUrl = () => {
    const env = process.env.NEXT_PUBLIC_API_URL;

    // Check if env is present, not a placeholder like "ap", and looks like a valid URL or relative path
    if (env && env !== "ap" && env.length > 2) {
        return env;
    }

    // Always return relative path in production Vercel to use rewrites if possible,
    // BUT we need a hard fallback if the user is testing locally or rewrites fail.

    // Check if we are in browser
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        // If developer is on localhost and hasn't set env, they likely want the live dev backend
        if (host === 'localhost' || host === '127.0.0.1') {
            return "https://wonderful-strength-production-a598.up.railway.app";
        }
    }

    // Default fallback for Vercel rewrites (relative)
    // If THIS fails (e.g. they are on a custom domain), we should probably use the absolute URL.
    return "";
};

export const API_URL = getApiUrl();
