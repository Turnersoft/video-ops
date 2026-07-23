import { useCallback, useEffect, useRef, useState, type WheelEvent as ReactWheelEvent } from 'react';

export function clampScrollTop(value: number, maxScroll: number): number {
    return Math.max(0, Math.min(value, maxScroll));
}

type UseCodeViewportScrollOptions = {
    autoScrollTop: number;
    maxScroll: number;
    interactive: boolean;
    /** Beat / content identity — resets manual scroll when it changes. */
    resetKey: string;
};

export function useCodeViewportScroll({
    autoScrollTop,
    maxScroll,
    interactive,
    resetKey,
}: UseCodeViewportScrollOptions) {
    const [manualScrollTop, setManualScrollTop] = useState<number | null>(null);
    const userScrolledRef = useRef(false);
    const prevResetKeyRef = useRef(resetKey);

    useEffect(() => {
        if (prevResetKeyRef.current !== resetKey) {
            prevResetKeyRef.current = resetKey;
            setManualScrollTop(null);
            userScrolledRef.current = false;
        }
    }, [resetKey]);

    useEffect(() => {
        if (!interactive || !userScrolledRef.current) {
            return;
        }
        setManualScrollTop((current) => {
            if (current === null) {
                return null;
            }
            return clampScrollTop(current, maxScroll);
        });
    }, [interactive, maxScroll]);

    useEffect(() => {
        if (!interactive || userScrolledRef.current) {
            return;
        }
        setManualScrollTop(null);
    }, [autoScrollTop, interactive]);

    const scrollTop =
        interactive && manualScrollTop !== null
            ? clampScrollTop(manualScrollTop, maxScroll)
            : autoScrollTop;

    const setScrollTop = useCallback(
        (value: number) => {
            if (!interactive) {
                return;
            }
            userScrolledRef.current = true;
            setManualScrollTop(clampScrollTop(value, maxScroll));
        },
        [interactive, maxScroll],
    );

    const onWheel = useCallback(
        (event: ReactWheelEvent<HTMLDivElement>) => {
            if (!interactive || maxScroll <= 0) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            userScrolledRef.current = true;
            setManualScrollTop((current) => {
                const base = current ?? autoScrollTop;
                return clampScrollTop(base + event.deltaY, maxScroll);
            });
        },
        [autoScrollTop, interactive, maxScroll],
    );

    return {
        scrollTop,
        setScrollTop,
        onWheel,
    };
}
