import {
    initialMathJaxContext,
    loadMathJax3,
    MathJaxContextType,
    type IMathJax3,
    type IMathJaxConfig3,
} from '@yozora/react-mathjax';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { VIDEO_MATHJAX_CONFIG, VIDEO_MATHJAX_SRC } from './videoMathJaxConfig';

type SafeMathJaxProviderProps = {
    children: ReactNode;
    mathjaxSrc?: string;
    mathjaxConfig?: IMathJaxConfig3;
    loading?: ReactNode;
};

/**
 * Drop-in MathJax provider that skips @yozora/react-mathjax's unmount `texReset()`
 * call — that method is often missing on the CDN build and throws during Remotion remounts.
 */
export function SafeMathJaxProvider({
    children,
    mathjaxSrc = VIDEO_MATHJAX_SRC,
    mathjaxConfig = VIDEO_MATHJAX_CONFIG as IMathJaxConfig3,
    loading = null,
}: SafeMathJaxProviderProps) {
    const [MathJax3, setMathJax3] = useState<IMathJax3 | null>(null);

    useEffect(() => {
        let cancelled = false;
        void loadMathJax3(mathjaxSrc, mathjaxConfig).then((loaded) => {
            if (!cancelled) {
                setMathJax3(loaded);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [mathjaxConfig, mathjaxSrc]);

    const context = useMemo(
        () => ({
            ...initialMathJaxContext,
            MathJax3,
        }),
        [MathJax3],
    );

    if (!MathJax3 && loading) {
        return <>{loading}</>;
    }

    return <MathJaxContextType.Provider value={context}>{children}</MathJaxContextType.Provider>;
}
