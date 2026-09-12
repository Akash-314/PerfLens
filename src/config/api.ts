/**
 * Unified API Base URL configuration for PerfLens frontend.
 * Defaults to relative '/api/v1' which leverages Vite dev proxy in local development
 * and same-origin reverse proxies in production, while allowing override via
 * VITE_API_BASE_URL for custom staging or multi-domain production environments.
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
