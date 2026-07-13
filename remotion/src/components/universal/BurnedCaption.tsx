// /Users/johndoe/Documents/company/video_ops/remotion/src/components/universal/BurnedCaption.tsx
import { useCallback, useState } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { useCompositionScale } from "../../lib/useCompositionScale";
import { useOutdoorLayout } from "../../lib/outdoorLayoutContext";
import type { NarrationStripMode } from "../../lib/narrationStrip";
import type { CaptionSegment } from "../../lib/renderProps";
import { activeEventIndex } from "../../video-kit/useSceneClock";
import { SayDisplayParagraphs } from "../../../../../basic_ui/src/pages/VideoOpsPage/SayDisplayParagraphs";
import { EditableSayParagraphs } from "../../../../../basic_ui/src/pages/VideoOpsPage/EditableSayParagraphs";
import { BeatCommentEditor } from "../BeatCommentEditor";

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
}: BurnedCaptionProps) {
  const s = useCompositionScale();
  const outdoorFormat = useOutdoorLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const isPreview = mode === "preview";
  const isOutdoor = Boolean(outdoorFormat);
  const isOutdoorExport = !isPreview && isOutdoor;
  const isOutdoorPortraitCaption = isOutdoor && outdoorFormat === "portrait";
  const isOutdoorLandscapeCaption = isOutdoor && outdoorFormat === "landscape";
  const outdoorCaptionEnFontSize = s.px(
    outdoorFormat === "portrait" ? 54 : outdoorFormat === "landscape" ? 34 : 50,
  );
  const outdoorCaptionZhFontSize = s.px(
    outdoorFormat === "portrait" ? 54 : outdoorFormat === "landscape" ? 28 : 50,
  );
  const outdoorCaptionEnColor = isOutdoorLandscapeCaption
    ? "#4DA6FF"
    : "#FAF8F3";
  const outdoorCaptionZhColor = isOutdoorLandscapeCaption
    ? "#FFD54F"
    : "#FAF8F3";
  const [copyFeedback, setCopyFeedback] = useState("");

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
  const useSegments = !isPreview && Boolean(segments?.length);
  const lines = useSegments
    ? segments!.map((segment) => segment.text)
    : beatLines;
  const linesZh = useSegments
    ? segments!.map((segment) => segment.zh ?? "")
    : beatLinesZh;

  if (!lines.length) {
    return null;
  }

  const starts = useSegments
    ? segments!.map((segment) => segment.atSeconds)
    : captionTimings(lines, timings, durationSeconds);
  const events = starts.map((atSeconds, index) => ({ atSeconds, index }));
  const active = activeEventIndex(events, seconds);
  const line = lines[active] ?? lines[lines.length - 1];
  const lineZh = linesZh?.[active]?.trim() ? linesZh[active] : "";
  const nextLine = active < lines.length - 1 ? (lines[active + 1] ?? "") : "";
  const fullScript = lines.join("\n\n");

  const lineStart = starts[active] ?? 0;
  const lineEnd = starts[active + 1] ?? durationSeconds;
  const lineDuration = Math.max(0.001, lineEnd - lineStart);
  const localSeconds = seconds - lineStart;
  const beatProgress = Math.max(0, Math.min(1, localSeconds / lineDuration));
  const remainingSeconds = Math.max(0, lineEnd - seconds);
  const countdownDisplay = Math.ceil(remainingSeconds);
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

  return (
    <div
      style={{
        position: "absolute",
        left: isOutdoorLandscapeCaption
          ? s.px(48)
          : isOutdoorExport
            ? s.px(36)
            : isOutdoorPortraitCaption
              ? s.px(42)
              : 0,
        right: isOutdoorLandscapeCaption
          ? s.px(48)
          : isOutdoorExport
            ? s.px(36)
            : isOutdoorPortraitCaption
              ? s.px(42)
              : 0,
        top: isOutdoorLandscapeCaption
          ? undefined
          : isOutdoorExport
            ? 0
            : isOutdoorPortraitCaption
              ? Math.max(s.px(24), Math.round(s.height / 3) - s.px(170))
              : undefined,
        height: isOutdoorLandscapeCaption
          ? undefined
          : isOutdoorExport
            ? Math.round(s.height / 3)
            : undefined,
        bottom: isOutdoorLandscapeCaption
          ? 0
          : isOutdoorExport || isOutdoorPortraitCaption
            ? undefined
            : 0,
        minHeight: isPreview
          ? s.px(220)
          : isOutdoorLandscapeCaption
            ? undefined
            : isOutdoorExport || isOutdoorPortraitCaption
              ? undefined
              : s.px(112),
        overflow: "visible",
        padding: isOutdoorLandscapeCaption
          ? `${s.px(12)}px ${s.px(24)}px ${s.px(28)}px`
          : isOutdoorExport
            ? `${s.px(12)}px ${s.px(18)}px ${s.px(20)}px`
            : isOutdoorPortraitCaption
              ? `0 ${s.px(18)}px`
              : `${s.px(16)}px ${s.px(48)}px ${s.px(28)}px`,
        background:
          isOutdoorExport || isOutdoorPortraitCaption
            ? "transparent"
            : `linear-gradient(to top, rgba(8, 8, 10, 0.92) 0%, rgba(8, 8, 10, 0.78) 70%, transparent 100%)`,
        borderTop:
          isOutdoorExport || isOutdoorPortraitCaption
            ? undefined
            : `${s.px(2)}px solid rgba(255, 255, 255, 0.12)`,
        display: isOutdoorExport ? "flex" : undefined,
        flexDirection: isOutdoorExport ? "column" : undefined,
        alignItems: isOutdoorExport ? "center" : undefined,
        justifyContent: isOutdoorLandscapeCaption
          ? "flex-end"
          : isOutdoorExport
            ? "flex-end"
            : undefined,
        pointerEvents: isPreview ? "auto" : "none",
        boxSizing: "border-box",
        // Always above textbook overlay (zIndex 50) and PIP/hints.
        zIndex: 200,
      }}
    >
      {!isOutdoorExport ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: s.px(10),
            marginBottom: s.px(8),
          }}
        >
          <div
            style={{
              fontSize: s.px(11),
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: isPreview
                ? "rgba(245, 208, 138, 0.95)"
                : "rgba(255, 255, 255, 0.45)",
              fontWeight: 600,
              textAlign: "center",
              padding: isPreview ? `${s.px(4)}px ${s.px(10)}px` : undefined,
              borderRadius: isPreview ? 999 : undefined,
              border: isPreview
                ? `${s.px(1)}px solid rgba(245, 208, 138, 0.35)`
                : undefined,
              background: isPreview ? "rgba(245, 208, 138, 0.12)" : undefined,
            }}
          >
            {isPreview
              ? "Editor only · not in exported video"
              : "Narration · trim below this strip"}
          </div>
          {isPreview ? (
            <>
              <button
                type="button"
                disabled={!nextLine}
                onClick={() =>
                  void copyCaptionText(nextLine, "Copied next line")
                }
                style={{
                  fontSize: s.px(13),
                  fontWeight: 600,
                  padding: `${s.px(6)}px ${s.px(12)}px`,
                  borderRadius: s.px(8),
                  border: `${s.px(1)}px solid rgba(245, 241, 232, 0.22)`,
                  background: "rgba(255, 255, 255, 0.06)",
                  color: nextLine ? "#f5f1e8" : "rgba(245, 241, 232, 0.35)",
                  cursor: nextLine ? "pointer" : "not-allowed",
                  opacity: nextLine ? 1 : 0.55,
                }}
              >
                Copy next line
              </button>
              <button
                type="button"
                onClick={() => void copyCaptionText(line, "Copied line")}
                style={{
                  fontSize: s.px(13),
                  fontWeight: 600,
                  padding: `${s.px(6)}px ${s.px(12)}px`,
                  borderRadius: s.px(8),
                  border: `${s.px(1)}px solid rgba(245, 241, 232, 0.22)`,
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "#f5f1e8",
                  cursor: "pointer",
                }}
              >
                Copy active line
              </button>
              <button
                type="button"
                onClick={() =>
                  void copyCaptionText(fullScript, "Copied script")
                }
                style={{
                  fontSize: s.px(13),
                  fontWeight: 600,
                  padding: `${s.px(6)}px ${s.px(12)}px`,
                  borderRadius: s.px(8),
                  border: `${s.px(1)}px solid rgba(245, 241, 232, 0.22)`,
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "#f5f1e8",
                  cursor: "pointer",
                }}
              >
                Copy full script
              </button>
              {copyFeedback ? (
                <span
                  style={{
                    fontSize: s.px(13),
                    color: "#80d9c8",
                    fontWeight: 600,
                  }}
                >
                  {copyFeedback}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
      {isPreview ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: s.px(16),
              maxWidth: s.px(1600),
              margin: "0 auto",
              opacity,
              transform: `translateY(${captionY}px)`,
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "grid",
                gridTemplateColumns: nextLine ? "1fr 1fr" : "1fr",
                gap: s.px(20),
              }}
            >
              <div style={{ minWidth: 0, overflow: "visible" }}>
                <div
                  style={{
                    fontSize: s.px(11),
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(128, 217, 200, 0.9)",
                    marginBottom: s.px(6),
                  }}
                >
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
                    fontSize: s.px(24),
                    fontWeight: 650,
                    lineHeight: 1.35,
                    color: "#FAF8F3",
                    textShadow: "0 2px 24px rgba(0,0,0,0.45)",
                    userSelect: "text",
                    cursor: "text",
                  }}
                />
                {scriptId ? (
                  <div style={{ marginTop: s.px(12) }}>
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
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: s.px(11),
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(255, 255, 255, 0.4)",
                      marginBottom: s.px(6),
                    }}
                  >
                    Next
                  </div>
                  <SayDisplayParagraphs
                    text={nextLine}
                    paragraphStyle={{
                      fontSize: s.px(24),
                      fontWeight: 650,
                      lineHeight: 1.35,
                      color: "rgba(250, 248, 243, 0.55)",
                      userSelect: "text",
                      cursor: "text",
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: s.px(88),
                paddingLeft: s.px(8),
                borderLeft: `${s.px(2)}px solid rgba(255, 255, 255, 0.12)`,
              }}
            >
              <div
                style={{
                  fontSize: s.px(11),
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255, 255, 255, 0.45)",
                  marginBottom: s.px(4),
                }}
              >
                sec
              </div>
              <div
                style={{
                  fontSize: s.px(72),
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                  color:
                    countdownDisplay <= 3
                      ? "#f5a962"
                      : countdownDisplay <= 8
                        ? "#80d9c8"
                        : "#FAF8F3",
                  textShadow: "0 4px 24px rgba(0,0,0,0.5)",
                }}
              >
                {countdownDisplay}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            opacity,
            transform: `translateY(${captionY}px)`,
            maxWidth: isOutdoorExport
              ? s.px(1600)
              : isOutdoorPortraitCaption
                ? s.px(1500)
                : s.px(1200),
            margin: "0 auto",
            textAlign: "center",
            userSelect: "none",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: isOutdoorLandscapeCaption
                ? outdoorCaptionEnFontSize
                : isOutdoorExport
                  ? outdoorCaptionEnFontSize
                  : isOutdoorPortraitCaption
                    ? s.px(44)
                    : s.px(26),
              fontWeight: isOutdoorExport
                ? 800
                : isOutdoorPortraitCaption
                  ? 800
                  : 600,
              lineHeight: 1.15,
              color: outdoorCaptionEnColor,
              WebkitTextStroke:
                isOutdoorExport || isOutdoorPortraitCaption
                  ? `${s.px(1)}px rgba(0, 0, 0, 0.82)`
                  : undefined,
              paintOrder:
                isOutdoorExport || isOutdoorPortraitCaption
                  ? "stroke fill"
                  : undefined,
              textShadow:
                isOutdoorExport || isOutdoorPortraitCaption
                  ? "0 2px 10px rgba(0,0,0,0.85), 0 0 18px rgba(0,0,0,0.6)"
                  : "0 2px 24px rgba(0,0,0,0.45)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {singleLine(line)}
          </div>
          {lineZh ? (
            <div
              style={{
                marginTop: isOutdoorLandscapeCaption ? s.px(6) : s.px(10),
                fontSize: isOutdoorLandscapeCaption
                  ? outdoorCaptionZhFontSize
                  : isOutdoorExport
                    ? outdoorCaptionZhFontSize
                    : isOutdoorPortraitCaption
                      ? s.px(34)
                      : s.px(22),
                fontWeight: isOutdoorExport
                  ? 800
                  : isOutdoorPortraitCaption
                    ? 750
                    : 550,
                lineHeight: 1.15,
                color: outdoorCaptionZhColor,
                WebkitTextStroke:
                  isOutdoorExport || isOutdoorPortraitCaption
                    ? `${s.px(1)}px rgba(0, 0, 0, 0.78)`
                    : undefined,
                paintOrder:
                  isOutdoorExport || isOutdoorPortraitCaption
                    ? "stroke fill"
                    : undefined,
                textShadow:
                  isOutdoorExport || isOutdoorPortraitCaption
                    ? "0 2px 10px rgba(0,0,0,0.82), 0 0 16px rgba(0,0,0,0.55)"
                    : "0 2px 20px rgba(0,0,0,0.45)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {singleLine(lineZh)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
