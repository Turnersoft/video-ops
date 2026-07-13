// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/SceneNarrationAudio.tsx
import { Audio, Sequence, staticFile } from 'remotion';

import { staticPathForScriptAsset } from '../lib/scriptAssetPath';

type SceneNarrationAudioProps = {
    scriptId: string;
    beatVoiceSrc: string[];
    sayTimings: number[];
    fps: number;
};

export function SceneNarrationAudio({
    scriptId,
    beatVoiceSrc,
    sayTimings,
    fps,
}: SceneNarrationAudioProps) {
    return (
        <>
            {beatVoiceSrc.map((relativePath, index) => {
                if (!relativePath?.trim()) {
                    return null;
                }
                const from = Math.round((sayTimings[index] ?? 0) * fps);
                return (
                    <Sequence key={`${index}-${relativePath}`} from={from} layout="none">
                        <Audio src={staticFile(staticPathForScriptAsset(scriptId, relativePath))} />
                    </Sequence>
                );
            })}
        </>
    );
}
