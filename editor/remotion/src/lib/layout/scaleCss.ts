import type { CSSProperties } from 'react';

/** Sets `--s` for `scaled()` in component SCSS modules. */
export function scaleCss(scale: number): CSSProperties {
    return { '--s': String(scale) } as CSSProperties;
}
