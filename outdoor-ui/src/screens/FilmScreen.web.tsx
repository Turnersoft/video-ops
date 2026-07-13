import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatOutdoorApiError } from '../api/client';
import { useOutdoorUi } from '../context/OutdoorUiContext';
import { useOutdoorRoute } from '../hooks/useOutdoorRoute';
import { colors, spacing, typography } from '../theme';
import type { OutdoorScript, SlideEvent, TakeManifest, TakeMarker } from '../types';
import { fmtDuration } from '../utils/format';
import {
  liveToFilmScript,
  pickRecorderMime,
  resolveFocusedSlideCode,
  videoExtensionForMime,
} from '../utils/filmScript';
import { Button } from '../components/ui/Button';

export type FilmScreenProps = {
  scriptId: string;
};

function nowId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function FilmVideoPreview({
  stream,
  mirrored,
}: {
  stream: MediaStream | null;
  mirrored: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) {
      return;
    }
    video.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: mirrored ? 'scaleX(-1)' : 'none',
      }}
    />
  );
}

export function FilmScreen({ scriptId }: FilmScreenProps) {
  const { api, invalidateAll } = useOutdoorUi();
  const { navigateToScript } = useOutdoorRoute();

  const [script, setScript] = useState<OutdoorScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [useFront, setUseFront] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingClockMs, setRecordingClockMs] = useState(0);
  const [pendingTake, setPendingTake] = useState<{
    takeId: string;
    blob: Blob;
    durationMs: number;
    mimeType: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  const startedAtRef = useRef(0);
  const slideEventsRef = useRef<SlideEvent[]>([]);
  const markersRef = useRef<TakeMarker[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef(pickRecorderMime());
  const clockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const slides = script?.slides ?? [];
  const slide = slides[slideIndex] ?? slides[0];
  const focusedCode = useMemo(
    () => (slides.length ? resolveFocusedSlideCode(slides, slideIndex) : { label: 'Lean', code: '' }),
    [slideIndex, slides],
  );

  const elapsedMs = useCallback(() => {
    return startedAtRef.current > 0 ? Date.now() - startedAtRef.current : 0;
  }, []);

  const stopStream = useCallback((mediaStream: MediaStream | null) => {
    mediaStream?.getTracks().forEach((track) => track.stop());
    if (streamRef.current === mediaStream) {
      streamRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch {
      // ignore stop errors during teardown
    }
    recorderRef.current = null;
    if (clockTimerRef.current) {
      clearInterval(clockTimerRef.current);
      clockTimerRef.current = null;
    }
    stopStream(streamRef.current);
    setStream(null);
    setIsRecording(false);
    startedAtRef.current = 0;
  }, [stopStream]);

  const openCamera = useCallback(
    async (front: boolean) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not available in this browser.');
      }
      stopStream(streamRef.current);
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: front ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = nextStream;
      setStream(nextStream);
      return nextStream;
    },
    [stopStream],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const live = await api.getLiveScript(scriptId).catch(async () => {
          const outdoor = await api.getOutdoorScript(scriptId);
          return liveToFilmScript({
            schemaVersion: 1,
            id: outdoor.id,
            title: outdoor.title,
            language: outdoor.language ?? 'en',
            mode: 'timed',
            countdownSeconds: outdoor.countdownSeconds ?? 3,
            source: (outdoor.source as 'animation.md' | 'animation.json') ?? 'animation.json',
            updatedAt: outdoor.updatedAt ?? null,
            slides: outdoor.slides,
            beats: outdoor.beats ?? [],
          });
        });
        if (!active) {
          return;
        }
        const filmScript = liveToFilmScript(live);
        if (!filmScript.slides.length) {
          throw new Error('Script has no beats or slides to film.');
        }
        setScript(filmScript);
        await openCamera(true);
      } catch (loadError) {
        if (active) {
          setError(formatOutdoorApiError(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [api, scriptId]);

  useEffect(() => () => teardown(), [teardown]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingClockMs(0);
      return;
    }
    const timer = setInterval(() => {
      setRecordingClockMs(elapsedMs());
    }, 250);
    return () => clearInterval(timer);
  }, [elapsedMs, isRecording]);

  const markSlide = useCallback(
    (index: number) => {
      const entry = slides[index];
      if (!entry || !isRecording) {
        return;
      }
      slideEventsRef.current.push({
        slideId: entry.id,
        index,
        atMs: elapsedMs(),
      });
    },
    [elapsedMs, isRecording, slides],
  );

  const runCountdown = useCallback(async (seconds: number) => {
    for (let value = seconds; value > 0; value -= 1) {
      setCountdown(value);
      await sleep(1000);
    }
    setCountdown(null);
  }, []);

  const goToSlide = useCallback(
    async (nextIndex: number, withSlideCountdown: boolean) => {
      if (!script) {
        return;
      }
      const clamped = Math.max(0, Math.min(nextIndex, slides.length - 1));
      if (clamped === slideIndex) {
        return;
      }
      const nextSlide = slides[clamped];
      if (withSlideCountdown && isRecording && nextSlide?.countdownSeconds) {
        await runCountdown(nextSlide.countdownSeconds);
      }
      if (isRecording) {
        markSlide(clamped);
      }
      setSlideIndex(clamped);
    },
    [isRecording, markSlide, runCountdown, script, slideIndex, slides],
  );

  const finishRecording = useCallback(
    (blob: Blob, durationMs: number, takeId: string) => {
      setIsRecording(false);
      startedAtRef.current = 0;
      if (clockTimerRef.current) {
        clearInterval(clockTimerRef.current);
        clockTimerRef.current = null;
      }
      setPendingTake({
        takeId,
        blob,
        durationMs,
        mimeType: mimeTypeRef.current || blob.type || 'video/webm',
      });
    },
    [],
  );

  const startRecording = useCallback(async () => {
    if (!script || !stream || isRecording || pendingTake) {
      return;
    }
    const seconds = script.countdownSeconds ?? 3;
    if (seconds > 0) {
      await runCountdown(seconds);
    }

    const takeId = nowId('take');
    chunksRef.current = [];
    slideEventsRef.current = [{ slideId: slide.id, index: slideIndex, atMs: 0 }];
    markersRef.current = [];
    startedAtRef.current = Date.now();
    setIsRecording(true);

    const options = mimeTypeRef.current ? { mimeType: mimeTypeRef.current } : undefined;
    const recorder = new MediaRecorder(stream, options);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data?.size) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const durationMs = elapsedMs();
      const blob = new Blob(chunksRef.current, {
        type: mimeTypeRef.current || 'video/webm',
      });
      finishRecording(blob, durationMs, takeId);
    };
    recorder.start(1000);
  }, [
    elapsedMs,
    finishRecording,
    isRecording,
    pendingTake,
    runCountdown,
    script,
    slide.id,
    slideIndex,
    stream,
  ]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !recorderRef.current) {
      return;
    }
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(
            'Stop recording? Your take will finish and you can upload or retake.',
          )
        : true;
    if (!confirmed) {
      return;
    }
    recorderRef.current.stop();
  }, [isRecording]);

  const handleFlip = useCallback(async () => {
    if (isRecording) {
      return;
    }
    const next = !useFront;
    setUseFront(next);
    try {
      await openCamera(next);
    } catch (flipError) {
      Alert.alert('Camera', formatOutdoorApiError(flipError));
    }
  }, [isRecording, openCamera, useFront]);

  const handleNg = useCallback(() => {
    if (!isRecording) {
      return;
    }
    markersRef.current.push({
      id: `ng-${markersRef.current.length + 1}`,
      kind: 'ng',
      label: 'NG',
      atMs: elapsedMs(),
    });
  }, [elapsedMs, isRecording]);

  const handleBack = useCallback(() => {
    if (isRecording) {
      Alert.alert('Recording', 'Stop recording before leaving the film screen.');
      return;
    }
    teardown();
    navigateToScript(scriptId);
  }, [isRecording, navigateToScript, scriptId, teardown]);

  const handleRetake = useCallback(() => {
    setPendingTake(null);
    slideEventsRef.current = [];
    markersRef.current = [];
    setSlideIndex(0);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!pendingTake || !script || uploading) {
      return;
    }
    setUploading(true);
    try {
      const ext = videoExtensionForMime(pendingTake.mimeType);
      const manifest: TakeManifest = {
        schemaVersion: 1,
        scriptId: script.id,
        scriptTitle: script.title,
        takeId: pendingTake.takeId,
        recordedAt: new Date().toISOString(),
        videoUri: `${pendingTake.takeId}.${ext}`,
        durationMs: pendingTake.durationMs,
        slideEvents:
          slideEventsRef.current.length > 0
            ? slideEventsRef.current
            : [{ slideId: slides[0]?.id ?? 'slide-1', index: 0, atMs: 0 }],
        markers: markersRef.current,
      };
      const file = new File([pendingTake.blob], `${pendingTake.takeId}.${ext}`, {
        type: pendingTake.mimeType || `video/${ext}`,
      });
      const result = await api.uploadTake(manifest, file);
      setPendingTake(null);
      teardown();
      invalidateAll();
      Alert.alert('Uploaded', `Queued job ${result.jobId}`, [
        { text: 'OK', onPress: () => navigateToScript(scriptId) },
      ]);
    } catch (uploadError) {
      Alert.alert('Upload failed', formatOutdoorApiError(uploadError));
    } finally {
      setUploading(false);
    }
  }, [
    api,
    invalidateAll,
    navigateToScript,
    pendingTake,
    script,
    scriptId,
    slides,
    teardown,
    uploading,
  ]);

  const handleDone = useCallback(() => {
    setPendingTake(null);
    teardown();
    navigateToScript(scriptId);
  }, [navigateToScript, scriptId, teardown]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.orange} size="large" />
        <Text style={styles.meta}>Opening camera…</Text>
      </View>
    );
  }

  if (error || !script || !slide) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? 'Could not load script for filming.'}</Text>
        <Button label="Back to script" onPress={() => navigateToScript(scriptId)} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FilmVideoPreview stream={stream} mirrored={useFront} />

      {isRecording ? (
        <View style={styles.recBadge}>
          <Text style={styles.recBadgeText}>
            REC · {fmtDuration(recordingClockMs)} · {slideEventsRef.current.length} marks
          </Text>
        </View>
      ) : null}

      <View style={styles.overlay}>
        <View style={styles.promptCard}>
          <Text style={styles.promptProgress}>
            Slide {slideIndex + 1} / {slides.length}
            {script.title ? ` · ${script.title}` : ''}
          </Text>
          <ScrollView style={styles.promptScroll} nestedScrollEnabled>
            <Text style={styles.promptWords}>{slide.body}</Text>
            {focusedCode.code ? (
              <View style={styles.promptCode}>
                <Text style={styles.promptCodeLabel}>{focusedCode.label}</Text>
                <Text style={styles.promptCodeBody}>{focusedCode.code}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.controlBtn} onPress={handleBack} disabled={isRecording}>
            <Text style={styles.controlText}>Close</Text>
          </Pressable>
          <Pressable
            style={styles.controlBtn}
            onPress={() => void goToSlide(slideIndex - 1, false)}
            disabled={slideIndex <= 0}
          >
            <Text style={styles.controlText}>Prev</Text>
          </Pressable>
          <Pressable
            style={styles.controlBtn}
            onPress={() => void goToSlide(slideIndex + 1, true)}
            disabled={slideIndex >= slides.length - 1}
          >
            <Text style={styles.controlText}>Next</Text>
          </Pressable>
          <Pressable style={styles.controlBtn} onPress={() => void handleFlip()} disabled={isRecording}>
            <Text style={styles.controlText}>Flip</Text>
          </Pressable>
          <Pressable style={styles.controlBtn} onPress={handleNg} disabled={!isRecording}>
            <Text style={styles.controlText}>NG</Text>
          </Pressable>
          <Pressable
            style={[styles.controlBtn, styles.recordBtn, isRecording ? styles.stopBtn : null]}
            onPress={() => void (isRecording ? stopRecording() : startRecording())}
          >
            <Text style={styles.recordText}>{isRecording ? 'Stop' : 'Record'}</Text>
          </Pressable>
        </View>
      </View>

      {countdown !== null ? (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      ) : null}

      {pendingTake ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Take ready</Text>
            <Text style={styles.modalCopy}>
              {fmtDuration(pendingTake.durationMs)} · {slideEventsRef.current.length} slide marks ·{' '}
              {markersRef.current.length} NG
            </Text>
            <Text style={styles.modalCopy}>Take: {pendingTake.takeId}</Text>
            <View style={styles.modalActions}>
              <Button
                label={uploading ? 'Uploading…' : 'Upload to Mac pipeline'}
                variant="primary"
                disabled={uploading}
                onPress={() => void handleUpload()}
              />
              <Button label="Retake" onPress={handleRetake} disabled={uploading} />
              <Button label="Done" onPress={handleDone} disabled={uploading} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
  },
  error: {
    color: colors.offline,
    fontSize: typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    gap: spacing.sm,
    // @ts-expect-error web gradient
    backgroundImage: 'linear-gradient(to top, rgba(2,6,23,0.78), transparent 50%)',
  },
  promptCard: {
    backgroundColor: 'rgba(2, 6, 23, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.18)',
    borderRadius: 20,
    padding: spacing.sm,
    maxHeight: '48vh',
  },
  promptScroll: {
    maxHeight: '40vh',
  },
  promptProgress: {
    color: colors.section,
    fontSize: typography.tiny,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  promptWords: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  promptCode: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  promptCodeLabel: {
    color: colors.orange,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  promptCodeBody: {
    marginTop: 6,
    color: colors.code,
    fontFamily: 'Menlo',
    fontSize: 13,
    lineHeight: 18,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  controlText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.small,
  },
  recordBtn: {
    backgroundColor: colors.danger,
  },
  stopBtn: {
    backgroundColor: colors.orange,
  },
  recordText: {
    color: '#fff7ed',
    fontWeight: '900',
    fontSize: typography.body,
  },
  recBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  recBadgeText: {
    color: '#fecaca',
    fontWeight: '900',
    fontSize: typography.small,
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
  },
  countdownText: {
    color: '#fff7ed',
    fontSize: 120,
    fontWeight: '900',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    padding: spacing.lg,
    zIndex: 60,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  modalCopy: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '700',
  },
  modalActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
