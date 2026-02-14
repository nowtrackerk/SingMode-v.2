/**
 * Network utility to get the local network IP address for QR code generation
 * This allows mobile devices on the same network to connect to the dev server
 */

export function getNetworkUrl(): string {
    if (typeof window === 'undefined') return '';

    // In production or when accessing via network IP, use current origin
    const currentOrigin = window.location.origin;

    // If already accessing via IP (not localhost), use that
    if (!currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1')) {
        return currentOrigin + window.location.pathname;
    }

    // For localhost, try to detect network IP from the URL
    // Vite dev server shows network URL in console, but we can't access it from browser
    // So we'll use a placeholder that the user needs to replace, or use localhost as fallback

    // Check if there's a stored network IP or full URL
    const storedNetworkIp = localStorage.getItem('kstar_network_ip');
    if (storedNetworkIp) {
        // If it starts with http/https, treat as full URL (e.g., ngrok tunnel)
        if (storedNetworkIp.startsWith('http')) {
            return storedNetworkIp;
        }
        // Otherwise treat as IP and append port/path
        const port = window.location.port;
        return `http://${storedNetworkIp}:${port}${window.location.pathname}`;
    }

    // Fallback to current origin (localhost)
    return currentOrigin + window.location.pathname;
}

export function setNetworkIp(ip: string) {
    localStorage.setItem('kstar_network_ip', ip);
    window.dispatchEvent(new Event('kstar_sync'));
}

export function getStoredNetworkIp(): string | null {
    return localStorage.getItem('kstar_network_ip');
}

export function clearNetworkIp() {
    localStorage.removeItem('kstar_network_ip');
    window.dispatchEvent(new Event('kstar_sync'));
}
