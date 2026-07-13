// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/SceneSlide.tsx
import type { OutdoorRenderFormat, RenderScene } from '../lib/renderProps';
import { SceneComposer } from './SceneComposer';

type SceneSlideProps = {
    scriptId: string;
    slide: RenderScene;
    width: number;
    height: number;
    showDirector?: boolean;
    contentRevision?: number;
    outdoorFormat?: OutdoorRenderFormat;
};

/** Thin wrapper — scene rendering lives in SceneComposer + video-kit. */
export function SceneSlide({
    scriptId,
    slide,
    width,
    height,
    showDirector,
    contentRevision,
    outdoorFormat,
}: SceneSlideProps) {
    return (
        <SceneComposer
            scriptId={scriptId}
            scene={slide}
            width={width}
            height={height}
            showDirector={showDirector}
            contentRevision={contentRevision}
            outdoorFormat={outdoorFormat}
        />
    );
}
