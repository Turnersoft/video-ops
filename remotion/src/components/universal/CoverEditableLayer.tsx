// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/CoverEditableLayer.tsx
import { useCallback, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

import {
    clampCoverLayerBox,
    layerBoxStyle,
    type CoverLayerBox,
    type CoverLayerId,
} from '@turn-video-shared/coverLayout';

import { useCompositionScale } from '../../lib/useCompositionScale';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

type DragMode = 'move' | ResizeHandle;

const HANDLES: Array<{ id: ResizeHandle; cursor: string; style: CSSProperties }> = [
    { id: 'nw', cursor: 'nwse-resize', style: { top: 0, left: 0, transform: 'translate(-50%, -50%)' } },
    { id: 'n', cursor: 'ns-resize', style: { top: 0, left: '50%', transform: 'translate(-50%, -50%)' } },
    { id: 'ne', cursor: 'nesw-resize', style: { top: 0, right: 0, transform: 'translate(50%, -50%)' } },
    { id: 'e', cursor: 'ew-resize', style: { top: '50%', right: 0, transform: 'translate(50%, -50%)' } },
    { id: 'se', cursor: 'nwse-resize', style: { bottom: 0, right: 0, transform: 'translate(50%, 50%)' } },
    { id: 's', cursor: 'ns-resize', style: { bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' } },
    { id: 'sw', cursor: 'nesw-resize', style: { bottom: 0, left: 0, transform: 'translate(-50%, 50%)' } },
    { id: 'w', cursor: 'ew-resize', style: { top: '50%', left: 0, transform: 'translate(-50%, -50%)' } },
];

function applyDrag(
    mode: DragMode,
    origin: CoverLayerBox,
    dxPct: number,
    dyPct: number,
): CoverLayerBox {
    if (mode === 'move') {
        return clampCoverLayerBox({
            ...origin,
            leftPct: origin.leftPct + dxPct,
            topPct: origin.topPct + dyPct,
        });
    }

    let { leftPct, topPct, widthPct, heightPct } = origin;

    if (mode.includes('e')) {
        widthPct += dxPct;
    }
    if (mode.includes('w')) {
        leftPct += dxPct;
        widthPct -= dxPct;
    }
    if (mode.includes('s')) {
        heightPct += dyPct;
    }
    if (mode.includes('n')) {
        topPct += dyPct;
        heightPct -= dyPct;
    }

    return clampCoverLayerBox({ leftPct, topPct, widthPct, heightPct });
}

type CoverEditableLayerProps = {
    layerId: CoverLayerId;
    label: string;
    box: CoverLayerBox;
    selected: boolean;
    canEdit: boolean;
    onSelect: (layerId: CoverLayerId) => void;
    onBoxChange: (layerId: CoverLayerId, box: CoverLayerBox) => void;
    onBoxCommit: () => void;
    children: ReactNode;
};

export function CoverEditableLayer({
    layerId,
    label,
    box,
    selected,
    canEdit,
    onSelect,
    onBoxChange,
    onBoxCommit,
    children,
}: CoverEditableLayerProps) {
    const s = useCompositionScale();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{ mode: DragMode; x: number; y: number; box: CoverLayerBox } | null>(
        null,
    );
    const handleSize = Math.max(10, s.px(10));

    const startDrag = useCallback(
        (event: PointerEvent, mode: DragMode) => {
            if (!canEdit) {
                return;
            }
            event.stopPropagation();
            onSelect(layerId);
            dragRef.current = {
                mode,
                x: event.clientX,
                y: event.clientY,
                box,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
        },
        [box, canEdit, layerId, onSelect],
    );

    const onPointerMove = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (!dragRef.current || !containerRef.current?.parentElement) {
                return;
            }
            const parent = containerRef.current.parentElement;
            const rect = parent.getBoundingClientRect();
            const dxPct = ((event.clientX - dragRef.current.x) / Math.max(rect.width, 1)) * 100;
            const dyPct = ((event.clientY - dragRef.current.y) / Math.max(rect.height, 1)) * 100;
            onBoxChange(
                layerId,
                applyDrag(dragRef.current.mode, dragRef.current.box, dxPct, dyPct),
            );
        },
        [layerId, onBoxChange],
    );

    const endDrag = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (!dragRef.current) {
                return;
            }
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
            onBoxCommit();
        },
        [onBoxCommit],
    );

    return (
        <div
            ref={containerRef}
            data-cover-layer={layerId}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            style={{
                ...layerBoxStyle(box),
                zIndex: selected ? 40 : 20,
                pointerEvents: canEdit ? 'auto' : 'none',
                touchAction: 'none',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canEdit ? 'move' : 'default',
                }}
                onPointerDown={(event) => {
                    if (!canEdit) {
                        return;
                    }
                    onSelect(layerId);
                    startDrag(event, 'move');
                }}
            >
                {children}

                {canEdit && selected && (
                    <>
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                border: `${Math.max(2, s.px(2))}px solid #7c3aed`,
                                borderRadius: s.px(2),
                                pointerEvents: 'none',
                                boxShadow: '0 0 0 1px rgba(255,255,255,0.85)',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                top: s.px(-22),
                                left: 0,
                                padding: `${s.px(2)}px ${s.px(8)}px`,
                                background: '#7c3aed',
                                color: '#fff',
                                fontSize: s.px(11),
                                fontFamily: 'Inter, system-ui, sans-serif',
                                fontWeight: 600,
                                borderRadius: s.px(4),
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {label}
                        </div>
                        {HANDLES.map((handle) => (
                            <div
                                key={handle.id}
                                onPointerDown={(event) => startDrag(event, handle.id)}
                                style={{
                                    position: 'absolute',
                                    width: handleSize,
                                    height: handleSize,
                                    background: '#ffffff',
                                    border: `${Math.max(2, s.px(2))}px solid #7c3aed`,
                                    borderRadius: s.px(2),
                                    cursor: handle.cursor,
                                    zIndex: 50,
                                    boxSizing: 'border-box',
                                    ...handle.style,
                                }}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
