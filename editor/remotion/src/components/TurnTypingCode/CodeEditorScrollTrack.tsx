import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

import { clampScrollTop } from './useCodeViewportScroll';

type CodeEditorScrollTrackProps = {
    scrollTop: number;
    maxScroll: number;
    viewportHeight: number;
    contentHeight: number;
    variant?: 'dark' | 'light';
    interactive?: boolean;
    onScrollTopChange?: (scrollTop: number) => void;
};

/** Visible scroll thumb for compare code panes (content scrolls via transform, not overflow). */
export function CodeEditorScrollTrack({
    scrollTop,
    maxScroll,
    viewportHeight,
    contentHeight,
    variant = 'light',
    interactive = false,
    onScrollTopChange,
}: CodeEditorScrollTrackProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{
        pointerId: number;
        startY: number;
        startScrollTop: number;
    } | null>(null);

    const trackInset = 4;
    const trackHeight = Math.max(0, viewportHeight - trackInset * 2);
    const thumbHeight = Math.max(28, Math.round((viewportHeight / contentHeight) * trackHeight));
    const thumbTravel = Math.max(0, trackHeight - thumbHeight);
    const thumbTop = thumbTravel > 0 && maxScroll > 0 ? (scrollTop / maxScroll) * thumbTravel : 0;

    const scrollFromTrackY = useCallback(
        (clientY: number) => {
            const track = trackRef.current;
            if (!track || maxScroll <= 0) {
                return;
            }
            const rect = track.getBoundingClientRect();
            const y = clientY - rect.top - trackInset - thumbHeight / 2;
            const ratio = thumbTravel > 0 ? clampScrollTop(y, thumbTravel) / thumbTravel : 0;
            onScrollTopChange?.(ratio * maxScroll);
        },
        [maxScroll, onScrollTopChange, thumbHeight, thumbTravel, trackInset],
    );

    const onTrackPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!interactive || !onScrollTopChange) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            scrollFromTrackY(event.clientY);
        },
        [interactive, onScrollTopChange, scrollFromTrackY],
    );

    const onThumbPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!interactive || !onScrollTopChange) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            dragRef.current = {
                pointerId: event.pointerId,
                startY: event.clientY,
                startScrollTop: scrollTop,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
        },
        [interactive, onScrollTopChange, scrollTop],
    );

    const onThumbPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId || !onScrollTopChange) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const deltaY = event.clientY - drag.startY;
            const scrollDelta = thumbTravel > 0 ? (deltaY / thumbTravel) * maxScroll : 0;
            onScrollTopChange(clampScrollTop(drag.startScrollTop + scrollDelta, maxScroll));
        },
        [maxScroll, onScrollTopChange, thumbTravel],
    );

    const onThumbPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        dragRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    }, []);

    if (maxScroll <= 0 || viewportHeight <= 0 || contentHeight <= 0) {
        return null;
    }

    const trackColor =
        variant === 'dark' ? 'rgba(255, 255, 255, 0.14)' : 'rgba(60, 54, 45, 0.14)';
    const thumbColor =
        variant === 'dark' ? 'rgba(255, 255, 255, 0.55)' : 'rgba(60, 54, 45, 0.5)';

    return (
        <div
            ref={trackRef}
            aria-hidden
            onPointerDown={onTrackPointerDown}
            style={{
                position: 'absolute',
                top: trackInset,
                right: 4,
                bottom: trackInset,
                width: 10,
                borderRadius: 999,
                background: trackColor,
                pointerEvents: interactive ? 'auto' : 'none',
                zIndex: 2,
                cursor: interactive ? 'pointer' : undefined,
                touchAction: 'none',
            }}
        >
            <div
                onPointerDown={onThumbPointerDown}
                onPointerMove={onThumbPointerMove}
                onPointerUp={onThumbPointerUp}
                onPointerCancel={onThumbPointerUp}
                style={{
                    position: 'absolute',
                    left: 1,
                    right: 1,
                    top: thumbTop,
                    height: thumbHeight,
                    borderRadius: 999,
                    background: thumbColor,
                    boxShadow:
                        variant === 'dark'
                            ? '0 0 0 1px rgba(0, 0, 0, 0.45)'
                            : '0 0 0 1px rgba(255, 255, 255, 0.65)',
                    cursor: interactive ? 'grab' : undefined,
                    touchAction: 'none',
                }}
            />
        </div>
    );
}
