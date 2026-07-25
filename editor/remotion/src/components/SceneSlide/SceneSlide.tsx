// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/SceneSlide.tsx
import { ScriptStripUiProvider } from '../../lib/context/scriptStripUiContext';
import type { OutdoorRenderFormat, RenderScene } from '../../lib/types/renderProps';
import { SceneComposer } from '../SceneComposer/SceneComposer';

type SceneSlideProps = {
    scriptId: string;
    slide: RenderScene;
    width: number;
    height: number;
    showDirector?: boolean;
    contentRevision?: number;
    outdoorFormat?: OutdoorRenderFormat;
    /** Script-editing preview: ignore linked take footage even if render props include outdoorEdit. */
    forceStudioFootagePlaceholder?: boolean;
};

/** Thin wrapper — scene rendering lives in SceneComposer + lib/sceneViews + lib/layers. */
export function SceneSlide({
    scriptId,
    slide,
    width,
    height,
    showDirector,
    contentRevision,
    outdoorFormat,
    forceStudioFootagePlaceholder,
}: SceneSlideProps) {
    return (
        <ScriptStripUiProvider>
            <SceneComposer
                scriptId={scriptId}
                scene={slide}
                width={width}
                height={height}
                showDirector={showDirector}
                contentRevision={contentRevision}
                outdoorFormat={outdoorFormat}
                forceStudioFootagePlaceholder={forceStudioFootagePlaceholder}
            />
        </ScriptStripUiProvider>
    );
}
