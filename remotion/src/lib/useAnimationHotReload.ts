// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/useAnimationHotReload.ts
import { videoOpsScriptFolder } from '@turn-video-shared/videoOpsPaths';
import { getRemotionEnvironment, staticFile } from 'remotion';
import { useEffect, useRef, useState } from 'react';

import {
    animationDocumentFingerprint,
    parseAnimationDocumentRaw,
} from './loadAnimationDocument';
import type { VideoFromScriptRenderProps } from './renderProps';

const POLL_MS = 1500;

function animationJsonUrl(scriptId: string, cacheBust: number): string {
    const base = staticFile(`${videoOpsScriptFolder(scriptId)}/animation.json`);
    return `${base}${base.includes('?') ? '&' : '?'}v=${cacheBust}`;
}

/** Load animation.json and poll for edits in Studio/Player (not during final render). */
export function useAnimationHotReload(
    scriptId: string,
    showDirector: boolean,
    projectInput: VideoFromScriptRenderProps | null | undefined,
): {
    project: VideoFromScriptRenderProps | null;
    error: string;
    loading: boolean;
} {
    const [project, setProject] = useState<VideoFromScriptRenderProps | null>(projectInput ?? null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(!projectInput);
    const fingerprintRef = useRef('');
    const revisionRef = useRef(0);

    useEffect(() => {
        if (projectInput) {
            setProject(projectInput);
            setError('');
            setLoading(false);
            return;
        }

        let cancelled = false;
        const env = getRemotionEnvironment();
        const shouldPoll = !env.isRendering && (env.isStudio || env.isPlayer);

        const applyProject = (next: VideoFromScriptRenderProps) => {
            if (cancelled) {
                return;
            }
            setProject(next);
            setError('');
            setLoading(false);
        };

        const loadOnce = async () => {
            try {
                const response = await fetch(animationJsonUrl(scriptId, revisionRef.current), {
                    cache: 'no-store',
                });
                if (!response.ok) {
                    throw new Error(`Could not load animation.json for ${scriptId}`);
                }
                const raw = await response.text();
                fingerprintRef.current = animationDocumentFingerprint(raw);
                applyProject(
                    parseAnimationDocumentRaw(raw, scriptId, {
                        showDirector,
                        contentRevision: revisionRef.current,
                    }),
                );
            } catch (caught) {
                if (cancelled) {
                    return;
                }
                setError(caught instanceof Error ? caught.message : 'Could not load animation.');
                setLoading(false);
            }
        };

        void loadOnce();

        if (!shouldPoll) {
            return () => {
                cancelled = true;
            };
        }

        const onAnimationChanged = (event: Event) => {
            const detail = (event as CustomEvent<{ scriptId?: string }>).detail;
            if (detail?.scriptId && detail.scriptId !== scriptId) {
                return;
            }
            revisionRef.current += 1;
            void loadOnce();
        };
        window.addEventListener('video-ops-animation-changed', onAnimationChanged);

        const interval = window.setInterval(() => {
            void (async () => {
                try {
                    const response = await fetch(animationJsonUrl(scriptId, Date.now()), {
                        cache: 'no-store',
                    });
                    if (!response.ok || cancelled) {
                        return;
                    }
                    const raw = await response.text();
                    const fingerprint = animationDocumentFingerprint(raw);
                    if (fingerprint === fingerprintRef.current) {
                        return;
                    }
                    fingerprintRef.current = fingerprint;
                    revisionRef.current += 1;
                    applyProject(
                        parseAnimationDocumentRaw(raw, scriptId, {
                            showDirector,
                            contentRevision: revisionRef.current,
                        }),
                    );
                } catch {
                    // Keep last good project on transient poll failures.
                }
            })();
        }, POLL_MS);

        return () => {
            cancelled = true;
            window.removeEventListener('video-ops-animation-changed', onAnimationChanged);
            window.clearInterval(interval);
        };
    }, [projectInput, scriptId, showDirector]);

    return { project, error, loading };
}
