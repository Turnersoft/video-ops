/** Local write API for Video Ops (Remotion Studio sidecar + Vite plugin). */
export const VIDEO_OPS_DEV_API_PORT = 3021;

export function videoOpsDevApiOrigin(): string {
    if (typeof window !== 'undefined') {
        const { hostname, protocol } = window.location;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return `${protocol}//${hostname}:${VIDEO_OPS_DEV_API_PORT}`;
        }
    }
    return `http://127.0.0.1:${VIDEO_OPS_DEV_API_PORT}`;
}

export function videoOpsDevApiUrl(pathname: string): string {
    const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${videoOpsDevApiOrigin()}${path}`;
}
