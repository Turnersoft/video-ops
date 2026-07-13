// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/Root.tsx
import { Composition } from 'remotion';

import { VideoFromScript } from './compositions/VideoFromScript';
import { VideoOutdoor, outdoorDurationInFrames } from './compositions/VideoOutdoor';
import compositionMeta from './generated/composition-meta.json';
import manifest from '../../manifest.json';

type CompositionMeta = Record<
    string,
    {
        fps: number;
        width: number;
        height: number;
        totalFrames: number;
    }
>;

const meta = compositionMeta as CompositionMeta;
const OUTDOOR_MAX_SECONDS = 900;

export const RemotionRoot: React.FC = () => {
    return (
        <>
            {manifest.scripts.map((scriptId) => {
                const project = meta[scriptId] ?? {
                    fps: 30,
                    width: 1920,
                    height: 1080,
                    totalFrames: 1,
                };

                return (
                    <Composition
                        key={scriptId}
                        id={scriptId}
                        component={VideoFromScript}
                        durationInFrames={project.totalFrames}
                        fps={project.fps}
                        width={project.width}
                        height={project.height}
                        defaultProps={{ scriptId, showDirector: false }}
                    />
                );
            })}
            <Composition
                id="video-outdoor-portrait"
                component={VideoOutdoor}
                durationInFrames={outdoorDurationInFrames(OUTDOOR_MAX_SECONDS, 30)}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ scriptId: 'sets-v2-04-set-equality', format: 'portrait' }}
            />
            <Composition
                id="video-outdoor-landscape"
                component={VideoOutdoor}
                durationInFrames={outdoorDurationInFrames(OUTDOOR_MAX_SECONDS, 30)}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ scriptId: 'sets-v2-04-set-equality', format: 'landscape' }}
            />
        </>
    );
};
