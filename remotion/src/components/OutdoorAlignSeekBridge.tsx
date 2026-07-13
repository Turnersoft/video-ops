import { useEffect } from 'react';
import { getRemotionEnvironment } from 'remotion';

type AlignSeekMessage = {
    type: 'turn-outdoor-align-seek';
    frame: number;
    compositionId?: string;
};

function isAlignSeekMessage(data: unknown): data is AlignSeekMessage {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const record = data as Record<string, unknown>;
    return record.type === 'turn-outdoor-align-seek' && Number.isFinite(Number(record.frame));
}

/**
 * Listens for beat-tag seeks from the outdoor agent page (iframe parent)
 * and jumps the Remotion Studio timeline.
 */
export function OutdoorAlignSeekBridge({
    compositionId = 'video-outdoor-landscape',
}: {
    compositionId?: string;
}) {
    useEffect(() => {
        const env = getRemotionEnvironment();
        if (!env.isStudio && !env.isPlayer) {
            return;
        }

        const onMessage = (event: MessageEvent) => {
            if (!isAlignSeekMessage(event.data)) {
                return;
            }
            const frame = Math.max(0, Math.round(Number(event.data.frame)));
            const targetComposition = event.data.compositionId || compositionId;
            const studioWindow = window as Window & {
                remotion_setFrame?: (frame: number, composition: string, attempt: number) => void;
            };
            if (typeof studioWindow.remotion_setFrame === 'function') {
                studioWindow.remotion_setFrame(frame, targetComposition, 0);
                return;
            }
            void import('@remotion/studio')
                .then((studio) => {
                    studio.seek(frame);
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
