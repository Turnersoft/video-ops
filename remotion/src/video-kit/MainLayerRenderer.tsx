// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/video-kit/MainLayerRenderer.tsx
import type { ReactNode } from 'react';

import { CompareSceneContent } from '../components/CompareSceneContent';
import { Lean4CodeFromTrack, Lean4GoalFromTrack } from '../components/Lean4FromTrack';
import { Lean4VideoFrame } from '../components/Lean4VideoFrame';
import { TurnCodeFromTrack } from '../components/TurnCodeFromTrack';
import { TurnTypingCode } from '../components/TurnTypingCode';
import { TurnVideoFrame } from '../components/TurnVideoFrame';
import { SidePanelFromTrack } from '../components/SidePanelFromTrack';
import { ChapterBeat, chapterBeatFromScreenText } from '../components/universal/ChapterBeat';
import { MathBoard } from '../components/universal/MathBoard';
import { TerminalPanel } from '../components/universal/TerminalPanel';
import { SplitReceipt } from '../components/universal/SplitReceipt';
import { TitleCard } from '../components/universal/TitleCard';
import { VideoClipBeat } from '../components/universal/VideoClipBeat';
import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { useCompositionScale } from '../lib/useCompositionScale';
import type { RenderLayer, RenderScene } from '../lib/renderProps';
import type { LayoutPreset } from './types';
import type {
    ChapterBeatLayer,
    CompareLayer,
    MathBoardLayer,
    SplitReceiptLayer,
    TerminalLayer,
    TitleCardLayer,
    VideoClipLayer,
} from './types';

type MainLayerRendererProps = {
    scriptId: string;
    scene: RenderScene;
    layer: RenderLayer;
    layout: LayoutPreset;
    contentRevision?: number;
};

function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

export function MainLayerRenderer({
    scriptId,
    scene,
    layer,
    layout,
    contentRevision,
}: MainLayerRendererProps): ReactNode {
    const s = useCompositionScale();

    switch (layer.type) {
        case 'turn-ide':
            return (
                <TurnVideoFrame
                    sceneTitle={scene.title}
                    main={
                        <TurnCodeFromTrack
                            scriptId={scriptId}
                            trackPath={asString(layer.track)}
                            fontSize={s.codeFontSize}
                            minFontSize={s.codeFontSizeMin}
                            viewportHeight={s.codeViewportHeight}
                        />
                    }
                    side={
                        <SidePanelFromTrack scriptId={scriptId} trackPath={asString(layer.track)} />
                    }
                />
            );

        case 'turn-code':
            return (
                <TurnVideoFrame
                    sceneTitle={scene.title}
                    main={
                        <TurnTypingCode
                            source={asString(layer.source)}
                            charsPerSecond={
                                (layer.animation as { charsPerSecond?: number } | undefined)
                                    ?.charsPerSecond ?? 28
                            }
                            fontSize={s.codeFontSize}
                            minFontSize={s.codeFontSizeMin}
                            viewportHeight={s.codeViewportHeight}
                        />
                    }
                    side={
                        <SidePanelFromTrack
                            scriptId={scriptId}
                            trackPath={`tracks/scene-${scene.index}-ide.json`}
                        />
                    }
                />
            );

        case 'lean4':
            return (
                <Lean4VideoFrame
                    sceneTitle={scene.title}
                    main={
                        <Lean4CodeFromTrack
                            scriptId={scriptId}
                            trackPath={asString(layer.track)}
                            fontSize={s.codeFontSize}
                            minFontSize={s.codeFontSizeMin}
                            viewportHeight={s.codeViewportHeight}
                        />
                    }
                    side={
                        <Lean4GoalFromTrack scriptId={scriptId} trackPath={asString(layer.track)} />
                    }
                />
            );

        case 'compare': {
            const compare = layer as CompareLayer;
            return (
                <CompareSceneContent
                    scriptId={scriptId}
                    leanTrack={asString(compare.leanTrack)}
                    turnTrack={asString(compare.turnTrack)}
                    leftLabel={compare.leftLabel}
                    rightLabel={compare.rightLabel}
                    editorFontScale={compare.editorFontScale}
                    leanEditorFontScale={compare.leanEditorFontScale}
                    renderFontScale={compare.renderFontScale}
                    beatFontScales={compare.beatFontScales}
                    director={scene.director}
                    durationSeconds={scene.durationSeconds}
                    hintLayoutsPath={compare.hintLayoutsPath}
                    contentRevision={contentRevision}
                    compiledTracks={compare.compiledTracks}
                    focusBeats={compare.focusBeats}
                    beatVideos={compare.beatVideos}
                />
            );
        }

        case 'video-clip': {
            const clip = layer as VideoClipLayer;
            return (
                <VideoClipBeat
                    scriptId={scriptId}
                    src={asString(clip.src)}
                    objectFit={clip.objectFit}
                    label={clip.label}
                    trimIn={clip.trimIn}
                    trimOut={clip.trimOut}
                />
            );
        }

        case 'title-card': {
            const card = layer as TitleCardLayer;
            return (
                <TitleCard
                    title={asString(card.title)}
                    subtitle={card.subtitle ? asString(card.subtitle) : undefined}
                    variant={card.variant ?? 'hook'}
                />
            );
        }

        case 'math-board':
            return (
                <MathBoard
                    scriptId={scriptId}
                    layer={layer as MathBoardLayer}
                    durationSeconds={scene.durationSeconds}
                />
            );

        case 'chapter-beat': {
            const beat = layer as ChapterBeatLayer & {
                label?: string;
                detail?: string;
                emphasis?: string | string[];
            };
            const emphasisRaw = beat.emphasis;
            const emphasis = Array.isArray(emphasisRaw) ? emphasisRaw[0] : emphasisRaw;
            return (
                <ChapterBeat
                    heading={beat.heading || beat.label || ''}
                    body={beat.body || beat.detail || ''}
                    emphasis={emphasis}
                />
            );
        }

        case 'screen-text': {
            const beat = chapterBeatFromScreenText(asString(layer.source));
            return <ChapterBeat {...beat} />;
        }

        case 'terminal': {
            const term = layer as TerminalLayer;
            const lines = Array.isArray(term.lines) ? term.lines.map((line) => String(line)) : [];
            return (
                <TerminalPanel
                    lines={lines}
                    prompt={term.prompt ? asString(term.prompt) : undefined}
                    charsPerSecond={term.charsPerSecond}
                />
            );
        }

        case 'split-receipt': {
            const receipt = layer as SplitReceiptLayer;
            return (
                <SplitReceipt
                    scriptId={scriptId}
                    leftHeading={receipt.leftHeading ? asString(receipt.leftHeading) : undefined}
                    rightHeading={receipt.rightHeading ? asString(receipt.rightHeading) : undefined}
                    knowledgeExportPath={
                        receipt.knowledgeExportPath
                            ? asString(receipt.knowledgeExportPath)
                            : undefined
                    }
                    proofExportPath={
                        receipt.proofExportPath ? asString(receipt.proofExportPath) : undefined
                    }
                    ideTrackPath={receipt.ideTrackPath ? asString(receipt.ideTrackPath) : undefined}
                    leftSectionIds={
                        Array.isArray(receipt.leftSectionIds)
                            ? receipt.leftSectionIds.map((id) => String(id))
                            : undefined
                    }
                />
            );
        }

        default:
            if (layout === 'dual-panel') {
                return (
                    <TurnVideoFrame
                        sceneTitle={scene.title}
                        main={
                            <div style={{ padding: 24, opacity: 0.6 }}>
                                Unknown layer: {layer.type}
                            </div>
                        }
                        side={<div />}
                    />
                );
            }
            return <div style={{ padding: 24 }}>Unknown layer: {layer.type}</div>;
    }
}
