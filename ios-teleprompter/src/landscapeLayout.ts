import * as ScreenOrientation from 'expo-screen-orientation';

export type HorizontalEdge = 'left' | 'right';

export type LandscapeChromeLayout = {
  /** Physical edge where the front camera sits in landscape. */
  cameraEdge: HorizontalEdge;
  /** Edge for controls — always opposite the front camera. */
  controlsEdge: HorizontalEdge;
  controlsZoneWidth: number;
};

const CONTROLS_ZONE_RATIO = 0.2;
const CONTROLS_ZONE_MIN = 112;

function oppositeEdge(edge: HorizontalEdge): HorizontalEdge {
  return edge === 'left' ? 'right' : 'left';
}

/**
 * iPhone front-camera edge in landscape (verified on device):
 * - LANDSCAPE_LEFT  → front camera on the RIGHT
 * - LANDSCAPE_RIGHT → front camera on the LEFT
 *
 * Expo's enum names follow UI rotation, not the physical camera edge.
 */
export function frontCameraEdgeFromOrientation(
  orientation: ScreenOrientation.Orientation,
): HorizontalEdge {
  if (orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT) {
    return 'right';
  }
  if (orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT) {
    return 'left';
  }
  return 'right';
}

export function isLandscapeDimensions(width: number, height: number): boolean {
  return width > height;
}

export function landscapeChromeLayout(
  orientation: ScreenOrientation.Orientation,
  width: number,
  height: number,
): LandscapeChromeLayout | null {
  if (!isLandscapeDimensions(width, height)) {
    return null;
  }

  const cameraEdge = frontCameraEdgeFromOrientation(orientation);
  return {
    cameraEdge,
    controlsEdge: oppositeEdge(cameraEdge),
    controlsZoneWidth: Math.max(CONTROLS_ZONE_MIN, Math.round(width * CONTROLS_ZONE_RATIO)),
  };
}
