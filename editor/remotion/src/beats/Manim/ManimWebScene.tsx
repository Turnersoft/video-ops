import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Scene } from 'manim-web';
import { ManimScene } from 'manim-web/react';

import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import { compileManimWebCode } from './compileManimWebCode';
import classes from './ManimWebScene.module.scss';

type ManimWebSceneProps = {
    code: string;
    contentRevision?: number;
};

/** Runs editable manim-web source from beat metadata. */
export function ManimWebScene({ code, contentRevision }: ManimWebSceneProps): ReactNode {
    const { width, height } = useCompositionScale();
    const compiled = useMemo(() => compileManimWebCode(code), [code]);
    const [runtimeError, setRuntimeError] = useState<string | null>(null);

    const onSceneReady = useCallback(
        async (scene: Scene) => {
            if (!compiled.construct) {
                return;
            }
            setRuntimeError(null);
            try {
                await compiled.construct(scene);
            } catch (err) {
                setRuntimeError(err instanceof Error ? err.message : String(err));
            }
        },
        [compiled],
    );

    const error = compiled.error ?? runtimeError;
    if (error) {
        return <pre className={classes.error}>{error}</pre>;
    }

    return (
        <div className={classes.root}>
            <ManimScene
                key={`${contentRevision ?? 0}-${code}`}
                width={width}
                height={height}
                backgroundColor="#070b14"
                onSceneReady={onSceneReady}
            />
        </div>
    );
}
