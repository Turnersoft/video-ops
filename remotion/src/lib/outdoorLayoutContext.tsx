// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/outdoorLayoutContext.tsx
import { createContext, useContext, type ReactNode } from 'react';

import type { OutdoorRenderFormat, RenderScene } from './renderProps';

export type OutdoorHintPanel = NonNullable<
    NonNullable<RenderScene['outdoorEdit']>['hintPanel']
>;

type OutdoorLayoutValue = {
    format?: OutdoorRenderFormat;
    hintPanel?: OutdoorHintPanel;
};

const OutdoorLayoutContext = createContext<OutdoorLayoutValue>({});

type OutdoorLayoutProviderProps = {
    format?: OutdoorRenderFormat;
    hintPanel?: OutdoorHintPanel;
    children: ReactNode;
};

export function OutdoorLayoutProvider({ format, hintPanel, children }: OutdoorLayoutProviderProps) {
    return (
        <OutdoorLayoutContext.Provider value={{ format, hintPanel }}>
            {children}
        </OutdoorLayoutContext.Provider>
    );
}

export function useOutdoorLayout(): OutdoorRenderFormat | undefined {
    return useContext(OutdoorLayoutContext).format;
}

export function useOutdoorHintPanel(): OutdoorHintPanel | undefined {
    return useContext(OutdoorLayoutContext).hintPanel;
}
