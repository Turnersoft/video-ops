// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/TurnIdeLayer.tsx
import { continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useEffect, useMemo, useState } from 'react';

import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { staticPathForScriptAsset } from '../lib/scriptAssetPath';
import { TurnTypingCode } from './TurnTypingCode';

type IdeTrack = {
    version: number;
    typing?: { charsPerSecond?: number; fullText: string };
    proofPanel?: { steps: Array<{ label: string; goal?: string }> };
    interactions?: Array<{
        atSeconds: number;
        kind: string;
        stepIndex?: number;
        branchId?: string;
    }>;
};

type TurnIdeLayerProps = {
    scriptId: string;
    trackPath: string;
    embedded?: boolean;
};

export function TurnIdeLayer({ scriptId, trackPath, embedded = false }: TurnIdeLayerProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const t = TURN_VIDEO_THEME;
    const [track, setTrack] = useState<IdeTrack | null>(null);
    const [handle] = useState(() => delayRender(`ide-track:${scriptId}:${trackPath}`));

    useEffect(() => {
        let cancelled = false;
        fetch(staticFile(staticPathForScriptAsset(scriptId, trackPath)))
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Missing track ${trackPath}`);
                }
                return response.json() as Promise<IdeTrack>;
            })
            .then((loaded) => {
                if (!cancelled) {
                    setTrack(loaded);
                }
                continueRender(handle);
            })
            .catch(() => {
                continueRender(handle);
            });
        return () => {
            cancelled = true;
        };
    }, [handle, scriptId, trackPath]);

    const seconds = frame / fps;
    const activeStep = useMemo(() => {
        if (!track?.interactions?.length) {
            return 0;
        }
        let step = 0;
        track.interactions.forEach((event) => {
            if (seconds >= event.atSeconds && event.kind === 'click-proof-step' && event.stepIndex !== undefined) {
                step = event.stepIndex;
            }
        });
        return step;
    }, [seconds, track?.interactions]);

    const typingSource = track?.typing?.fullText ?? '// loading track…';
    const charsPerSecond = track?.typing?.charsPerSecond ?? 28;
    const steps = track?.proofPanel?.steps ?? [];

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: embedded ? '1fr 300px' : '1fr 280px',
                gap: 0,
                height: embedded ? '100%' : '100%',
                minHeight: embedded ? 0 : undefined,
                boxSizing: 'border-box',
            }}
        >
            <div style={{ minHeight: 0, borderRight: `1px solid ${t.ide.windowBorder}` }}>
                <TurnTypingCode source={typingSource} charsPerSecond={charsPerSecond} />
            </div>
            <div
                style={{
                    background: t.proofPanel.bg,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    minHeight: 0,
                }}
            >
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: t.proofPanel.title,
                    }}
                >
                    Proof panel
                </div>
                {steps.map((step, index) => (
                    <div
                        key={step.label}
                        style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: index === activeStep ? t.proofPanel.stepActiveBg : t.proofPanel.stepBg,
                            border:
                                index === activeStep
                                    ? `1px solid ${t.proofPanel.stepActiveBorder}`
                                    : `1px solid ${t.proofPanel.border}`,
                            fontSize: 12,
                            lineHeight: 1.4,
                            boxShadow: index === activeStep ? `0 0 0 3px ${t.accent.ring}` : 'none',
                        }}
                    >
                        <div style={{ fontWeight: 600, color: t.syntax.plain }}>{step.label}</div>
                        {step.goal ? (
                            <div style={{ color: t.proofPanel.goal, marginTop: 4, fontFamily: 'monospace' }}>
                                {step.goal}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
