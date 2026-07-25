/** Open the Mac/browser webcam at the highest resolution the device reports. */
export async function openWebCameraStream(front: boolean): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API is not available in this browser.');
  }

  const facingMode = front ? 'user' : 'environment';
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: { facingMode },
  });

  const track = stream.getVideoTracks()[0];
  if (!track?.getCapabilities) {
    return stream;
  }

  const caps = track.getCapabilities();
  const maxWidth = caps.width?.max;
  const maxHeight = caps.height?.max;
  if (!maxWidth || !maxHeight) {
    return stream;
  }

  try {
    await track.applyConstraints({
      width: { ideal: maxWidth },
      height: { ideal: maxHeight },
    });
  } catch {
    // Some devices reject the combined max; keep the opened stream as-is.
  }

  return stream;
}

/** Current capture size after constraints are applied (for UI/debug). */
export function readWebCameraResolution(stream: MediaStream | null): {
  width: number;
  height: number;
} | null {
  const track = stream?.getVideoTracks()[0];
  if (!track) {
    return null;
  }
  const { width, height } = track.getSettings();
  if (!width || !height) {
    return null;
  }
  return { width, height };
}
