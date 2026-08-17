// /Users/johndoe/Documents/company/video_ops/remotion/src/components/universal/BurnedCaption.tsx
import { useCallback, useState, type CSSProperties } from "react";
import classes from './BurnedCaption.module.scss';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { scaleCss } from "../../lib/layout/scaleCss";
import { useCompositionScale } from "../../lib/layout/useCompositionScale";
import { useOutdoorLayout } from "../../lib/outdoor/outdoorLayoutContext";
import { PORTRAIT_PRESENTER_BAND_RATIO } from "../../lib/outdoor/portraitLayout";
import { useScriptStripUi } from "../../lib/context/scriptStripUiContext";
import type { NarrationStripMode } from "../../lib/outdoor/narrationStrip";
import type { CaptionSegment } from "../../lib/types/renderProps";
import { activeEventIndex } from "../../lib/layers/useSceneClock";
import { SayDisplayParagraphs } from '../../lib/compile/video-ops/SayDisplayParagraphs';
import { EditableSayParagraphs } from '../../lib/compile/video-ops/EditableSayParagraphs';
import { BeatCommentEditor } from "../BeatCommentEditor/BeatCommentEditor";

/** DISABLED: Studio "Now reading" preview panel (not in exported video). Re-enable when ready. */
const PREVIEW_SCRIPT_PANEL_ENABLED = false;

type BurnedCaptionProps = {
  lines: string[];
  linesZh?: string[];
  timings?: number[];
  /** Sentence-level segments timed to synthesized audio; overrides lines in export mode. */
  segments?: CaptionSegment[];
  durationSeconds: number;
  /** `preview` = editor/player only; `export` = burned into rendered MP4. */
  mode?: NarrationStripMode;
  scriptId?: string;
  sceneIndex?: number;
  beatComments?: string[];
  beatAllowScriptChange?: boolean[];
  burnCaptionsZh?: boolean;
};

function captionTimings(
  lines: string[],
  timings: number[] | undefined,
  durationSeconds: number,
): number[] {
  if (timings && timings.length === lines.length) {
    return timings;
  }
  const step = durationSeconds / Math.max(1, lines.length);
  return lines.map((_line, index) => index * step);
}

export function BurnedCaption({
  lines: beatLines,
  linesZh: beatLinesZh,
  timings,
  segments,
  durationSeconds,
  mode = "export",
  scriptId,
  sceneIndex = 0,
  beatComments,
  beatAllowScriptChange,
  burnCaptionsZh = true,
}: BurnedCaptionProps) {
  const s = useCompositionScale();
  const outdoorFormat = useOutdoorLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const isPreview = mode === "preview";
  const isOutdoor = Boolean(outdoorFormat);
  const isOutdoorExport = !isPreview && isOutdoor;
  const isOutdoorBurnedCaption = isOutdoor && (isOutdoorExport || mode === "export");
  const isOutdoorPortraitCaption = isOutdoor && outdoorFormat === "portrait";
  const isOutdoorLandscapeCaption = isOutdoor && outdoorFormat === "landscape";
  const outdoorCaptionEnFontSize = s.px(
    outdoorFormat === "portrait" ? 54 : outdoorFormat === "landscape" ? 34 : 50,
  );
  const outdoorCaptionZhFontSize = s.px(
    outdoorFormat === "portrait" ? 54 : outdoorFormat === "landscape" ? 28 : 50,
  );
  const outdoorCaptionEnColor = isOutdoor ? "#4DA6FF" : "#FAF8F3";
  const outdoorCaptionZhColor = isOutdoor ? "#FFD54F" : "#FAF8F3";
  const [copyFeedback, setCopyFeedback] = useState("");
  const { collapsed, toggleCollapsed } = useScriptStripUi();

  const copyCaptionText = useCallback(async (text: string, label: string) => {
    if (!text.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(label);
      window.setTimeout(() => setCopyFeedback(""), 1800);
    } catch {
      setCopyFeedback("Copy failed");
      window.setTimeout(() => setCopyFeedback(""), 1800);
    }
  }, []);

  // Export with synthesized narration: one sentence at a time, timed to the audio.
  const useSegments = Boolean(segments?.length) && (isOutdoorBurnedCaption || !isPreview);
  const lines = useSegments
    ? segments!.map((segment) => segment.text)
    : beatLines;
  const linesZh = useSegments
    ? segments!.map((segment) => segment.zh ?? "")
    : beatLinesZh;

  if (!lines.length) {
    return null;
  }

  if (isPreview && !PREVIEW_SCRIPT_PANEL_ENABLED && !isOutdoorBurnedCaption) {
    return null;
  }

  const starts = useSegments
    ? segments!.map((segment) => segment.atSeconds)
    : captionTimings(lines, timings, durationSeconds);
  const segmentEnds = useSegments
    ? segments!.map((segment) => segment.atSeconds + segment.durationSeconds)
    : undefined;
  const events = starts.map((atSeconds, index) => ({ atSeconds, index }));
  const active = activeEventIndex(events, seconds);
  const line = lines[active] ?? lines[lines.length - 1];
  const lineZh =
    burnCaptionsZh && linesZh?.[active]?.trim() ? linesZh[active] : "";
  const nextLine = active < lines.length - 1 ? (lines[active + 1] ?? "") : "";
  const fullScript = lines.join("\n\n");

  const lineStart = starts[active] ?? 0;
  const lineEnd = useSegments
    ? (starts[active + 1] ?? segmentEnds?.[active] ?? durationSeconds)
    : (starts[active + 1] ?? durationSeconds);
  const lineDuration = Math.max(0.001, lineEnd - lineStart);
  const localSeconds = seconds - lineStart;
  const beatProgress = Math.max(0, Math.min(1, localSeconds / lineDuration));
  // DISABLED: text-script countdown (preview strip "sec" timer). Re-enable when ready.
  // const remainingSeconds = Math.max(0, lineEnd - seconds);
  // const countdownDisplay = Math.ceil(remainingSeconds);
  const lineEnter = spring({
    frame: Math.max(0, frame - Math.round(lineStart * fps)),
    fps,
    config: { damping: 18, stiffness: 140 },
  });
  const opacity =
    interpolate(localSeconds / lineDuration, [0.88, 1], [1, 0.85], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * lineEnter;
  const captionY = interpolate(lineEnter, [0, 1], [s.px(12), 0]);

  const singleLine = (text: string) => text.replace(/\s+/g, " ").trim();
  const previewCollapsed = isPreview && collapsed;

  const rootClassName = [
    classes.root,
    isPreview && classes.rootPreview,
    previewCollapsed && classes.rootPreviewCollapsed,
    isOutdoorBurnedCaption &&
      isOutdoorPortraitCaption &&
      classes.rootOutdoorPortrait,
    isOutdoorBurnedCaption &&
      isOutdoorLandscapeCaption &&
      classes.rootOutdoorLandscape,
  ]
    .filter(Boolean)
    .join(" ");

  const presenterBandHeight = Math.round(s.height * PORTRAIT_PRESENTER_BAND_RATIO);
  const rootStyle: CSSProperties = {
    ...scaleCss(s.scale),
    ...(isOutdoorBurnedCaption && isOutdoorPortraitCaption
      ? {
          top: 0,
          bottom: "unset",
          height: presenterBandHeight,
        }
      : {}),
  };

  const paragraphStyle = {
    fontSize: s.px(24),
    fontWeight: 650,
    lineHeight: 1.35,
    userSelect: "text" as const,
    cursor: "text" as const,
  };

  // const countdownClassName = [
  //   classes.countdownValue,
  //   countdownDisplay <= 3
  //     ? classes.countdownValueWarning
  //     : countdownDisplay <= 8
  //       ? classes.countdownValueSoon
  //       : "",
  // ]
  //   .filter(Boolean)
  //   .join(" ");

  const exportCaptionClassName = [
    classes.exportCaption,
    isOutdoorPortraitCaption && isOutdoorBurnedCaption
      ? classes.exportCaptionOutdoorPortrait
      : isOutdoorLandscapeCaption && isOutdoorBurnedCaption
        ? classes.exportCaptionOutdoorLandscape
        : classes.exportCaptionDefault,
  ].join(" ");

  const captionEnClassName = [
    classes.captionEn,
    isOutdoorBurnedCaption || isOutdoorPortraitCaption
      ? classes.captionEnOutdoor
      : classes.captionEnDefault,
    isOutdoorPortraitCaption ? classes.captionEnOutdoorPortrait : "",
  ]
    .filter(Boolean)
    .join(" ");

  const captionZhClassName = [
    classes.captionZh,
    isOutdoorBurnedCaption || isOutdoorPortraitCaption
      ? classes.captionZhOutdoor
      : classes.captionZhDefault,
    isOutdoorLandscapeCaption ? classes.captionZhOutdoorLandscape : "",
    isOutdoorPortraitCaption ? classes.captionZhOutdoorPortrait : "",
  ]
    .filter(Boolean)
    .join(" ");

  const strokeWidth = s.px(1);

  return (
    <div className={rootClassName} style={rootStyle}>
      {!isOutdoorBurnedCaption ? (
        <div
          role={previewCollapsed ? "button" : undefined}
          tabIndex={previewCollapsed ? 0 : undefined}
          onClick={previewCollapsed ? toggleCollapsed : undefined}
          onKeyDown={
            previewCollapsed
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleCollapsed();
                  }
                }
              : undefined
          }
          className={`${classes.toolbar} ${previewCollapsed ? classes.toolbarCollapsed : ""}`}
        >
          <div
            className={`${classes.toolbarGroup} ${previewCollapsed ? classes.toolbarGroupCollapsed : ""}`}
          >
            <div className={`${classes.badge} ${isPreview ? classes.badgePreview : ""}`}>
              {isPreview
                ? "Editor only · not in exported video"
                : "Narration · trim below this strip"}
            </div>
            {previewCollapsed ? (
              <div className={classes.collapsedPreview} title={line}>
                {singleLine(line) || "—"}
              </div>
            ) : null}
            {isPreview && !previewCollapsed ? (
              <>
                <button
                  type="button"
                  disabled={!nextLine}
                  onClick={() =>
                    void copyCaptionText(nextLine, "Copied next line")
                  }
                  className={`${classes.toolbarButton} ${!nextLine ? classes.toolbarButtonDisabled : ""}`}
                >
                  Copy next line
                </button>
                <button
                  type="button"
                  onClick={() => void copyCaptionText(line, "Copied line")}
                  className={classes.toolbarButton}
                >
                  Copy active line
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void copyCaptionText(fullScript, "Copied script")
                  }
                  className={classes.toolbarButton}
                >
                  Copy full script
                </button>
                {copyFeedback ? (
                  <span className={classes.copyFeedback}>{copyFeedback}</span>
                ) : null}
              </>
            ) : null}
          </div>
          {isPreview ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleCollapsed();
              }}
              title={collapsed ? "Expand script panel" : "Collapse script panel"}
              aria-expanded={!collapsed}
              className={classes.toolbarButton}
            >
              {collapsed ? "▲ Show script" : "▼ Hide script"}
            </button>
          ) : null}
        </div>
      ) : null}
      {isPreview && !previewCollapsed ? (
        <div
          className={classes.previewPanel}
          style={{ opacity, transform: `translateY(${captionY}px)` }}
        >
          <div
            className={`${classes.previewGrid} ${nextLine ? classes.previewGridDual : classes.previewGridSingle}`}
          >
            <div className={classes.previewColumn}>
              <div className={`${classes.sectionLabel} ${classes.sectionLabelActive}`}>
                Now reading
              </div>
              <EditableSayParagraphs
                text={line}
                editable={isPreview && Boolean(scriptId)}
                scriptId={scriptId}
                beatIndex={active}
                sceneIndex={sceneIndex}
                beatProgress={beatProgress}
                paragraphStyle={{
                  ...paragraphStyle,
                  color: "#FAF8F3",
                  textShadow: "0 2px 24px rgba(0,0,0,0.45)",
                }}
              />
              {scriptId ? (
                <div className={classes.beatCommentWrap}>
                  <BeatCommentEditor
                    key={`${scriptId}-${sceneIndex}-${active}`}
                    scriptId={scriptId}
                    sceneIndex={sceneIndex}
                    beatIndex={active}
                    comment={beatComments?.[active] ?? ""}
                    allowScriptChange={
                      beatAllowScriptChange?.[active] !== false
                    }
                  />
                </div>
              ) : null}
            </div>
            {nextLine ? (
              <div className={classes.previewColumnNext}>
                <div className={`${classes.sectionLabel} ${classes.sectionLabelNext}`}>
                  Next
                </div>
                <SayDisplayParagraphs
                  text={nextLine}
                  paragraphStyle={{
                    ...paragraphStyle,
                    color: "rgba(250, 248, 243, 0.55)",
                  }}
                />
              </div>
            ) : null}
          </div>
          {/* DISABLED: text-script countdown
          <div className={classes.countdownColumn}>
            <div className={classes.countdownLabel}>sec</div>
            <div className={countdownClassName}>{countdownDisplay}</div>
          </div>
          */}
        </div>
      ) : null}
      {!isPreview || isOutdoorBurnedCaption ? (
        <div
          className={exportCaptionClassName}
          style={{ opacity, transform: `translateY(${captionY}px)` }}
        >
          <div
            className={captionEnClassName}
            style={{
              ...(isOutdoorBurnedCaption || isOutdoorPortraitCaption
                ? {
                    fontSize: outdoorCaptionEnFontSize,
                    color: outdoorCaptionEnColor,
                    WebkitTextStroke: `${strokeWidth}px rgba(0, 0, 0, 0.82)`,
                  }
                : {}),
            }}
          >
            {singleLine(line)}
          </div>
          {lineZh ? (
            <div
              className={captionZhClassName}
              style={{
                ...(isOutdoorBurnedCaption || isOutdoorPortraitCaption
                  ? {
                      fontSize: outdoorCaptionZhFontSize,
                      color: outdoorCaptionZhColor,
                      WebkitTextStroke: `${strokeWidth}px rgba(0, 0, 0, 0.78)`,
                    }
                  : {}),
              }}
            >
              {singleLine(lineZh)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
