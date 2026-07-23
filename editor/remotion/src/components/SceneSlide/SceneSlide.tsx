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
            />
        </ScriptStripUiProvider>
    );
}
