// Detect if running online or locally
const isOnline = window.location.hostname === 'dashboard.celflow.com';

export const API_BASE_URL = isOnline
    ? 'https://api.celflow.com'
    : process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const AI_GATEWAY_URL = 'https://ai.celflow.com';

console.log('🔧 API Config:', { isOnline, API_BASE_URL, AI_GATEWAY_URL });
