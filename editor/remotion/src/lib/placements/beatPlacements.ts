/** Unified front-layer objects on a composited beat (video editor model). */

export type BeatPlacementKind = 'video' | 'image' | 'sticker' | 'manim';

export type BeatPlacementMask = {
    shape: 'circle' | 'rectangle';
};

export type BeatPlacementEnter = 'none' | 'fade' | 'scale';

export type VideoOpsBeatPlacement = {
    id: string;
    kind: BeatPlacementKind;
    /** Script-relative asset path (video / image / manim export). */
    src?: string;
    text?: string;
    emoji?: string;
    /** Manim / math-board diagram id when kind is `manim`. */
    diagramId?: string;
    atSeconds: number;
    durationSeconds: number;
    /** Normalized frame position (0–1). */
    x: number;
    y: number;
    width: number;
    height?: number;
    zIndex?: number;
    objectFit?: 'contain' | 'cover';
    mask?: BeatPlacementMask;
    enter?: BeatPlacementEnter;
    label?: string;
};

export type VideoOpsBeatBaseFootage = {
    src: string;
    objectFit?: 'contain' | 'cover';
    label?: string;
};

const PRESET_XY: Record<string, { x: number; y: number }> = {
    'top-left': { x: 0.06, y: 0.08 },
    'top-right': { x: 0.72, y: 0.08 },
    'bottom-left': { x: 0.06, y: 0.72 },
    'bottom-right': { x: 0.72, y: 0.72 },
    center: { x: 0.38, y: 0.4 },
};

/** Legacy sticker row from beat-studio / animation compile. */
export type LegacyBeatSticker = {
    id: string;
    text?: string;
    emoji?: string;
    assetPath?: string;
    atSeconds: number;
    durationSeconds: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    x?: number;
    y?: number;
    width?: number;
};

export function legacyStickerToPlacement(sticker: LegacyBeatSticker): VideoOpsBeatPlacement {
    const preset = PRESET_XY[sticker.position] ?? PRESET_XY.center;
    const hasImage = Boolean(sticker.assetPath?.trim());
    return {
        id: sticker.id,
        kind: hasImage ? 'image' : 'sticker',
        text: sticker.text,
        emoji: sticker.emoji,
        src: sticker.assetPath?.trim() || undefined,
        atSeconds: sticker.atSeconds,
        durationSeconds: sticker.durationSeconds,
        x: sticker.x ?? preset.x,
        y: sticker.y ?? preset.y,
        width: sticker.width ?? (hasImage ? 0.22 : 0.28),
        enter: 'scale',
        zIndex: 10,
    };
}

export function legacyStickersToPlacements(
    stickers: LegacyBeatSticker[] | undefined,
): VideoOpsBeatPlacement[] {
    if (!stickers?.length) {
        return [];
    }
    return stickers.map(legacyStickerToPlacement);
}

export function normalizePlacement(raw: Partial<VideoOpsBeatPlacement> & { id: string }): VideoOpsBeatPlacement {
    const kind = raw.kind ?? (raw.src ? 'video' : raw.diagramId ? 'manim' : 'sticker');
    const preset = PRESET_XY.center;
    return {
        id: raw.id,
        kind,
        src: raw.src,
        text: raw.text,
        emoji: raw.emoji,
        diagramId: raw.diagramId,
        atSeconds: raw.atSeconds ?? 0,
        durationSeconds: raw.durationSeconds ?? 3,
        x: raw.x ?? preset.x,
        y: raw.y ?? preset.y,
        width: raw.width ?? 0.28,
        height: raw.height,
        zIndex: raw.zIndex ?? 10,
        objectFit: raw.objectFit ?? 'contain',
        mask: raw.mask,
        enter: raw.enter ?? 'fade',
        label: raw.label,
    };
}

export function placementsFromUnknown(raw: unknown): VideoOpsBeatPlacement[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    const out: VideoOpsBeatPlacement[] = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') {
            continue;
        }
        const row = entry as Record<string, unknown>;
        if (typeof row.id !== 'string') {
            continue;
        }
        if ('position' in row && typeof row.position === 'string') {
            out.push(legacyStickerToPlacement(row as LegacyBeatSticker));
            continue;
        }
        out.push(
            normalizePlacement({
                id: row.id,
                kind: row.kind as BeatPlacementKind | undefined,
                src: typeof row.src === 'string' ? row.src : typeof row.assetPath === 'string' ? row.assetPath : undefined,
                text: typeof row.text === 'string' ? row.text : undefined,
                emoji: typeof row.emoji === 'string' ? row.emoji : undefined,
                diagramId: typeof row.diagramId === 'string' ? row.diagramId : undefined,
                atSeconds: typeof row.atSeconds === 'number' ? row.atSeconds : 0,
                durationSeconds: typeof row.durationSeconds === 'number' ? row.durationSeconds : 3,
                x: typeof row.x === 'number' ? row.x : undefined,
                y: typeof row.y === 'number' ? row.y : undefined,
                width: typeof row.width === 'number' ? row.width : undefined,
                height: typeof row.height === 'number' ? row.height : undefined,
                zIndex: typeof row.zIndex === 'number' ? row.zIndex : undefined,
                objectFit: row.objectFit === 'cover' || row.objectFit === 'contain' ? row.objectFit : undefined,
                mask:
                    row.mask &&
                    typeof row.mask === 'object' &&
                    ((row.mask as BeatPlacementMask).shape === 'circle' ||
                        (row.mask as BeatPlacementMask).shape === 'rectangle')
                        ? (row.mask as BeatPlacementMask)
                        : undefined,
                enter:
                    row.enter === 'none' || row.enter === 'fade' || row.enter === 'scale'
                        ? row.enter
                        : undefined,
                label: typeof row.label === 'string' ? row.label : undefined,
            }),
        );
    }
    return out.sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0));
}

/** @deprecated Use VideoOpsBeatPlacement */
export type VideoOpsBeatSticker = LegacyBeatSticker;
