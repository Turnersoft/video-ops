// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/CroppedSvgImage.tsx
import { Img } from 'remotion';

export type PixelCropBox = {
    /** Full source canvas size (its `viewBox` width/height), in the same units as the box. */
    canvasWidth: number;
    canvasHeight: number;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
};

type CroppedSvgImageProps = {
    src: string;
    box: PixelCropBox;
    style?: { width?: string; [key: string]: unknown };
};

/**
 * Some shared cover SVGs (e.g. `lean.svg`) are full-canvas raster exports with the real logo
 * occupying a small clipped region. This renders only that region, scaled to fill its container
 * without distortion, using the region's own aspect ratio (derived from the pixel box).
 */
export function CroppedSvgImage({ src, box, style }: CroppedSvgImageProps) {
    const cropLeftPct = box.x0 / box.canvasWidth;
    const cropRightPct = box.x1 / box.canvasWidth;
    const cropTopPct = box.y0 / box.canvasHeight;
    const cropBottomPct = box.y1 / box.canvasHeight;
    const cropWidthPct = cropRightPct - cropLeftPct;
    const cropHeightPct = cropBottomPct - cropTopPct;

    const imgLeftPct = -100 * (cropLeftPct / cropWidthPct);
    const imgTopPct = -100 * (cropTopPct / cropHeightPct);
    const imgWidthPct = 100 / cropWidthPct;
    const imgHeightPct = 100 / cropHeightPct;

    return (
        <div
            style={{
                position: 'relative',
                overflow: 'hidden',
                aspectRatio: `${cropWidthPct * box.canvasWidth} / ${cropHeightPct * box.canvasHeight}`,
                ...style,
            }}
        >
            <Img
                src={src}
                style={{
                    position: 'absolute',
                    left: `${imgLeftPct}%`,
                    top: `${imgTopPct}%`,
                    width: `${imgWidthPct}%`,
                    height: `${imgHeightPct}%`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                }}
            />
        </div>
    );
}
