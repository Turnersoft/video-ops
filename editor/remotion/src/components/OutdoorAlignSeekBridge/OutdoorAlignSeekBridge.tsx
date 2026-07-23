import { useEffect } from 'react';
import { getRemotionEnvironment, useCurrentFrame } from 'remotion';

type AlignSeekMessage = {
    type: 'turn-outdoor-align-seek';
    frame: number;
    compositionId?: string;
};

type AlignFrameMessage = {
    type: 'turn-outdoor-align-frame';
    frame: number;
    compositionId?: string;
};

function parseAlignSeekMessage(data: unknown): AlignSeekMessage | null {
    let record: Record<string, unknown> | null = null;
    if (typeof data === 'string') {
        try {
            const parsed: unknown = JSON.parse(data);
            if (parsed && typeof parsed === 'object') {
                record = parsed as Record<string, unknown>;
            }
        } catch {
            return null;
        }
    } else if (data && typeof data === 'object') {
        record = data as Record<string, unknown>;
    }
    if (!record) {
        return null;
    }
    if (record.type !== 'turn-outdoor-align-seek' || !Number.isFinite(Number(record.frame))) {
        return null;
    }
    return {
        type: 'turn-outdoor-align-seek',
        frame: Number(record.frame),
        compositionId:
            typeof record.compositionId === 'string' ? record.compositionId : undefined,
    };
}

function postFrameToParent(frame: number, compositionId: string): void {
    if (typeof window === 'undefined' || window.parent === window) {
        return;
    }
    const message: AlignFrameMessage = {
        type: 'turn-outdoor-align-frame',
        frame: Math.max(0, Math.round(frame)),
        compositionId,
    };
    window.parent.postMessage(message, '*');
}

/**
 * Listens for beat-tag seeks from the outdoor agent page (iframe parent)
 * and jumps the Remotion Studio timeline.
 * Also reports the current frame so the parent can restore scrub position after remount.
 */
export function OutdoorAlignSeekBridge({
    compositionId = 'video-outdoor-landscape',
}: {
    compositionId?: string;
}) {
    const frame = useCurrentFrame();

    useEffect(() => {
        const env = getRemotionEnvironment();
        if (!env.isStudio && !env.isPlayer) {
            return;
        }
        postFrameToParent(frame, compositionId);
    }, [compositionId, frame]);

    useEffect(() => {
        const env = getRemotionEnvironment();
        if (!env.isStudio && !env.isPlayer) {
            return;
        }

        const onMessage = (event: MessageEvent) => {
            const message = parseAlignSeekMessage(event.data);
            if (!message) {
                return;
            }
            const nextFrame = Math.max(0, Math.round(Number(message.frame)));
            const targetComposition = message.compositionId || compositionId;
            const studioWindow = window as Window & {
                remotion_setFrame?: (frame: number, composition: string, attempt: number) => void;
            };
            // Prefer the Studio composition setter; also call seek() so outdoorEmbed
            // and script compositions still jump when setFrame is a no-op.
            if (typeof studioWindow.remotion_setFrame === 'function') {
                studioWindow.remotion_setFrame(nextFrame, targetComposition, 0);
            }
            void import('@remotion/studio')
                .then((studio) => {
                    studio.seek(nextFrame);
                })
                .catch(() => {
                    // Studio API unavailable outside Remotion Studio.
                });
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [compositionId]);

    return null;
}
