import { AbsoluteFill } from "remotion";
import classes from "./FilmedPlaceholders.module.scss";

import type { OutdoorPipMask } from "../../lib/types/renderProps";
import { scaleCss } from "../../lib/layout/scaleCss";
import { useCompositionScale } from "../../lib/layout/useCompositionScale";
import { OutdoorFilmedClipMask } from "../OutdoorFilmedClipMask/OutdoorFilmedClipMask";

/** Default filmed-avatar mask — same geometry as OutdoorFilmedClipMask. */
export const DEFAULT_FILMED_AVATAR_MASK: OutdoorPipMask = {
  shape: "rectangle",
  x: 0.02,
  y: 0.55,
  w: 0.28,
  h: 0.38,
  videoX: 0.02,
  videoY: 0.55,
  videoW: 0.28,
  videoH: 0.38,
  objectPositionX: 0.5,
  objectPositionY: 0.5,
  scale: 1,
};

/** Screen-recording PIP placeholder (top-right) when a beat opts in via animation.md. */
export const DEFAULT_SCREEN_RECORDING_BOX = {
  x: 0.58,
  y: 0.08,
  w: 0.38,
  h: 0.44,
} as const;

export function hasFootageSrc(src: string | null | undefined): boolean {
  return Boolean(src && src.trim());
}

/** AI clone / VoxCPM: narration via audioSrc, no filmed take video. */
export function isVoiceOnlyOutdoorTake(
  outdoorEdit: { videoSrc?: string; audioSrc?: string } | null | undefined,
): boolean {
  return Boolean(outdoorEdit && !hasFootageSrc(outdoorEdit.videoSrc));
}

/** Solid green fill used inside mask / full-clip when take video is missing. */
export function GreenAvatarFill({
  label = "YOU · filmed",
}: {
  label?: string;
}) {
  return (
    <div className={classes.greenFill}>
      <div className={classes.greenFillLabel}>{label}</div>
    </div>
  );
}

type BoxProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sublabel?: string;
  fill: string;
  border: string;
};

function LabeledPlaceholderBox({
  x,
  y,
  w,
  h,
  label,
  sublabel,
  fill,
  border,
}: BoxProps) {
  const s = useCompositionScale();
  return (
    <div
      className={classes.placeholderBox}
      style={{
        ...scaleCss(s.scale),
        left: Math.round(s.width * x),
        top: Math.round(s.height * y),
        width: Math.round(s.width * w),
        height: Math.round(s.height * h),
        background: fill,
        borderColor: border,
      }}
    >
      <div className={classes.placeholderLabel}>{label}</div>
      {sublabel ? (
        <div className={classes.placeholderSublabel}>{sublabel}</div>
      ) : null}
    </div>
  );
}

export type StudioFilmedPlaceholdersProps = {
  scriptId: string;
  /** When true, skip green avatar (real talking-head footage present). */
  hasTalkingHeadFootage?: boolean;
  /** When true, skip screen box (real pip footage present). */
  hasScreenFootage?: boolean;
  /**
   * Opt-in label from animation.md `screen-recording: …`.
   * Screen placeholder is off unless this is set.
   */
  screenRecordingLabel?: string | null;
  /** Scene-wide studio presenter mask (editable framing; shared across beats). */
  presenterMask?: OutdoorPipMask | null;
  /** Active compare beat — mask drags persist for this beat only. */
  activeBeatIndex?: number;
  /** Scene index in animation.md — required for per-beat mask persistence. */
  sceneIndex?: number;
  /** Compare beats in this scene — enables sync-to-all-beats actions. */
  beatCount?: number;
};

/**
 * Studio overlays: editable green filmed avatar (full OutdoorFilmedClipMask editor)
 * plus an opt-in screen-recording box when the active beat declares `screen-recording`.
 */
export function StudioFilmedPlaceholders({
  scriptId,
  hasTalkingHeadFootage = false,
  hasScreenFootage = false,
  screenRecordingLabel = null,
  presenterMask = null,
  activeBeatIndex = 0,
  sceneIndex = 0,
  beatCount = 0,
}: StudioFilmedPlaceholdersProps) {
  const screenLabel = screenRecordingLabel?.trim() || null;
  const showScreen = Boolean(screenLabel) && !hasScreenFootage;
  const showAvatar = !hasTalkingHeadFootage;
  const screen = DEFAULT_SCREEN_RECORDING_BOX;
  const mask = presenterMask ?? DEFAULT_FILMED_AVATAR_MASK;

  if (!showAvatar && !showScreen) {
    return null;
  }

  return (
    <AbsoluteFill className={classes.overlay}>
      {showAvatar ? (
        <div className={classes.avatarEditor}>
          <OutdoorFilmedClipMask
            key={`presenter-mask-${sceneIndex}-${activeBeatIndex}`}
            scriptId={scriptId}
            src=""
            pipMask={mask}
            beatIndex={activeBeatIndex}
            sceneIndex={sceneIndex}
            beatCount={beatCount}
            enableMaskEditing
          />
        </div>
      ) : null}
      {showScreen && screenLabel ? (
        <LabeledPlaceholderBox
          x={screen.x}
          y={screen.y}
          w={screen.w}
          h={screen.h}
          label={screenLabel}
          sublabel="Recording placeholder"
          fill="linear-gradient(160deg, #1e293b 0%, #0f172a 100%)"
          border="rgba(56, 189, 248, 0.85)"
        />
      ) : null}
    </AbsoluteFill>
  );
}
