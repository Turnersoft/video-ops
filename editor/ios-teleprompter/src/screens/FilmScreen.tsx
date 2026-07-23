import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { OutdoorScript, SlideEvent, TakeManifest, TakeMarker } from '../scriptSchema';
import { landscapeChromeLayout } from '../landscapeLayout';
import { exportTakeToIcloudWorkflow, processTakeForWorkflow } from '../processTake';
import { ICLOUD_INBOX_FOLDER } from '../exportInbox';
import { isIcloudInboxAvailable } from 'outdoor-icloud-inbox';
import { TakeStepstones } from '@turn/outdoor-ui';
import { toLocalTakeView } from '../localTakeViews';
import {
  deleteRecordedVideo,
  generateThumbnail,
  persistRecordedVideo,
} from '../storage';
import { markTakeQueued, persistTakeLocally } from '../takePersistence';
import { enqueueTakeSync } from '../uploadQueue';
import {
  DEFAULT_VIDEO_RESOLUTION,
  loadVideoResolution,
  nextVideoResolution,
  saveVideoResolution,
  videoResolutionLabel,
  type VideoResolution,
} from '../videoSettings';

type FilmScreenProps = {
  script: OutdoorScript;
  onBack: () => void;
  onTakeSaved: (takeId?: string) => void;
};

type PendingTake = {
  takeId: string;
  videoUri: string;
  durationMs: number;
  recordedAt?: string;
  photoLibraryAssetId?: string;
  photoLibraryHint?: string;
  syncStatus?: TakeManifest['syncStatus'];
};

function nowId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function FilmScreen({ script, onBack, onTakeSaved }: FilmScreenProps) {
  useKeepAwake();

  const cameraRef = useRef<CameraView | null>(null);
  const takeStartedAtRef = useRef(0);
  const slideEventsRef = useRef<SlideEvent[]>([]);
  const markersRef = useRef<TakeMarker[]>([]);
  const extraHoldMsRef = useRef(0);
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [slideIndex, setSlideIndex] = useState(0);
  const [facing, setFacing] = useState<CameraType>('front');
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [fontScale, setFontScale] = useState(script.defaultFontScale ?? 1);
  const [timedMode, setTimedMode] = useState(script.mode === 'timed');
  const [holdLabel, setHoldLabel] = useState<string | null>(null);
  const [deviceOrientation, setDeviceOrientation] = useState<ScreenOrientation.Orientation>(
    ScreenOrientation.Orientation.PORTRAIT_UP,
  );
  const [videoResolution, setVideoResolution] = useState<VideoResolution>(DEFAULT_VIDEO_RESOLUTION);
  const [recordingClockMs, setRecordingClockMs] = useState(0);
  const [pendingTake, setPendingTake] = useState<PendingTake | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canSilentIcloud, setCanSilentIcloud] = useState(false);

  const slide = script.slides[slideIndex] ?? script.slides[0];
  const progressLabel = `${slideIndex + 1} / ${script.slides.length}`;
  const imageSource = slide.image?.dataUri ?? slide.image?.uri;
  const hasPermission = Boolean(cameraPermission?.granted && microphonePermission?.granted);

  const elapsedMs = useCallback(() => {
    return takeStartedAtRef.current > 0 ? Date.now() - takeStartedAtRef.current : 0;
  }, []);

  const clearSlideTimer = useCallback(() => {
    if (slideTimerRef.current) {
      clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }
  }, []);

  const recordSlideEvent = useCallback(
    (nextIndex: number) => {
      if (!isRecording) {
        return;
      }
      const nextSlide = script.slides[nextIndex];
      if (!nextSlide) {
        return;
      }
      slideEventsRef.current.push({
        slideId: nextSlide.id,
        index: nextIndex,
        atMs: elapsedMs(),
      });
    },
    [elapsedMs, isRecording, script.slides],
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
      const clamped = clamp(nextIndex, 0, script.slides.length - 1);
      if (clamped === slideIndex) {
        return;
      }

      const nextSlide = script.slides[clamped];
      if (withSlideCountdown && isRecording && nextSlide?.countdownSeconds) {
        await runCountdown(nextSlide.countdownSeconds);
      }

      extraHoldMsRef.current = 0;
      setHoldLabel(null);
      recordSlideEvent(clamped);
      setSlideIndex(clamped);
    },
    [isRecording, recordSlideEvent, runCountdown, script.slides, slideIndex],
  );

  const scheduleTimedAdvance = useCallback(() => {
    clearSlideTimer();
    if (!isRecording || !timedMode || !slide.durationSeconds) {
      return;
    }
    const totalMs = slide.durationSeconds * 1000 + extraHoldMsRef.current;
    slideTimerRef.current = setTimeout(() => {
      extraHoldMsRef.current = 0;
      setHoldLabel(null);
      void goToSlide(slideIndex + 1, true);
    }, totalMs);
  }, [clearSlideTimer, goToSlide, isRecording, slide.durationSeconds, slideIndex, timedMode]);

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

  useEffect(() => {
    setFontScale(script.defaultFontScale ?? 1);
    setTimedMode(script.mode === 'timed');
    setSlideIndex(0);
  }, [script.defaultFontScale, script.id, script.mode]);

  useEffect(() => {
    void loadVideoResolution().then(setVideoResolution);
  }, []);

  useEffect(() => {
    scheduleTimedAdvance();
    return clearSlideTimer;
  }, [clearSlideTimer, scheduleTimedAdvance, slide.id, slideIndex]);

  useEffect(() => {
    let active = true;

    const syncOrientation = async () => {
      const current = await ScreenOrientation.getOrientationAsync();
      if (active) {
        setDeviceOrientation(current);
      }
    };

    void syncOrientation();
    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      setDeviceOrientation(event.orientationInfo.orientation);
    });

    return () => {
      active = false;
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  useEffect(() => {
    void isIcloudInboxAvailable().then(setCanSilentIcloud);
  }, []);

  const requestPermissions = async () => {
    const camera = await requestCameraPermission();
    const microphone = await requestMicrophonePermission();
    if (!camera.granted || !microphone.granted) {
      Alert.alert('Permission needed', 'Camera and microphone permissions are required to film takes.');
    }
  };

  const addHold = (seconds: number) => {
    extraHoldMsRef.current += seconds * 1000;
    setHoldLabel(`+${Math.round(extraHoldMsRef.current / 1000)}s`);
    scheduleTimedAdvance();
  };

  const buildTakeManifest = async (pending: PendingTake): Promise<TakeManifest> => {
    const thumbnailUri = await generateThumbnail(pending.videoUri, pending.takeId);
    return {
      schemaVersion: 1,
      scriptId: script.id,
      scriptTitle: script.title,
      takeId: pending.takeId,
      recordedAt: pending.recordedAt ?? new Date().toISOString(),
      videoUri: pending.videoUri,
      thumbnailUri,
      durationMs: pending.durationMs,
      slideEvents:
        slideEventsRef.current.length > 0
          ? slideEventsRef.current
          : [{ slideId: script.slides[0]?.id ?? 'slide-1', index: 0, atMs: 0 }],
      markers: markersRef.current,
      photoLibraryAssetId: pending.photoLibraryAssetId,
      photoLibraryHint: pending.photoLibraryHint,
      syncStatus: pending.syncStatus,
    };
  };

  const resetRecordingSession = () => {
    slideEventsRef.current = [];
    markersRef.current = [];
    extraHoldMsRef.current = 0;
    setHoldLabel(null);
    setSlideIndex(0);
    setRecordingClockMs(0);
  };

  const handleProcessTake = async () => {
    if (!pendingTake || isProcessing) {
      return;
    }
    setIsProcessing(true);
    try {
      const take = await buildTakeManifest(pendingTake);
      const result = await processTakeForWorkflow(take);
      const savedTakeId = pendingTake.takeId;
      setPendingTake(null);
      resetRecordingSession();
      Alert.alert(
        result.method === 'queued' ? 'Saved on iPhone' : 'Queued for processing',
        result.message,
        [{ text: 'OK', onPress: () => onTakeSaved(savedTakeId) }],
      );
    } catch (error) {
      Alert.alert(
        'Process failed',
        error instanceof Error ? error.message : 'Could not queue this take for processing.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportToIcloud = async () => {
    if (!pendingTake || isProcessing) {
      return;
    }
    setIsProcessing(true);
    try {
      const take = await buildTakeManifest(pendingTake);
      const result = await exportTakeToIcloudWorkflow(take);
      setPendingTake({
        ...pendingTake,
        recordedAt: result.saved.recordedAt,
        photoLibraryAssetId: result.saved.photoLibraryAssetId,
        photoLibraryHint: result.saved.photoLibraryHint,
        syncStatus: result.saved.syncStatus,
      });
      if (result.exported) {
        const savedTakeId = pendingTake.takeId;
        setPendingTake(null);
        resetRecordingSession();
        Alert.alert('Exported', result.message, [
          { text: 'OK', onPress: () => onTakeSaved(savedTakeId) },
        ]);
        return;
      }
      Alert.alert('Kept on iPhone', result.message, [
        { text: 'Stay here', style: 'cancel' },
        {
          text: 'Done',
          onPress: () => {
            setPendingTake(null);
            resetRecordingSession();
            onTakeSaved();
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Export failed',
        error instanceof Error
          ? `${error.message}\n\nTake JSON is still kept locally and will auto-upload when online.`
          : 'Could not export this take to iCloud. Local copy is kept.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDone = () => {
    setPendingTake(null);
    resetRecordingSession();
    onTakeSaved();
  };

  const handleRetake = async () => {
    if (!pendingTake || isProcessing) {
      return;
    }
    await deleteRecordedVideo(pendingTake.takeId);
    setPendingTake(null);
    resetRecordingSession();
  };

  const queueRecordedTake = async (videoUri: string, durationMs: number) => {
    const takeId = nowId('take');
    const storedVideoUri = await persistRecordedVideo(videoUri, takeId);
    const pending: PendingTake = { takeId, videoUri: storedVideoUri, durationMs };
    setPendingTake(pending);
    try {
      const take = await buildTakeManifest(pending);
      const saved = await persistTakeLocally(take);
      await enqueueTakeSync(saved.takeId);
      const queued = (await markTakeQueued(saved.takeId)) ?? {
        ...saved,
        syncStatus: 'queued' as const,
      };
      setPendingTake({
        ...pending,
        recordedAt: queued.recordedAt,
        photoLibraryAssetId: queued.photoLibraryAssetId,
        photoLibraryHint: queued.photoLibraryHint,
        syncStatus: queued.syncStatus,
      });
    } catch (error) {
      Alert.alert(
        'Could not cache take metadata',
        error instanceof Error
          ? error.message
          : 'Video is on device, but JSON backup failed. Try Process / Export once more.',
      );
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording || pendingTake || !slide) {
      return;
    }
    takeStartedAtRef.current = Date.now();
    slideEventsRef.current = [{ slideId: slide.id, index: slideIndex, atMs: 0 }];
    markersRef.current = [];
    setIsRecording(true);

    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: 60 * 60,
      });
      const durationMs = elapsedMs();
      setIsRecording(false);
      takeStartedAtRef.current = 0;
      clearSlideTimer();
      if (result?.uri) {
        await queueRecordedTake(result.uri, durationMs);
      }
    } catch (error) {
      setIsRecording(false);
      takeStartedAtRef.current = 0;
      clearSlideTimer();
      Alert.alert('Recording failed', error instanceof Error ? error.message : 'Unknown error.');
    }
  };

  const startCountdown = async () => {
    if (!hasPermission) {
      await requestPermissions();
      return;
    }
    const seconds = script.countdownSeconds ?? 3;
    await runCountdown(seconds);
    await startRecording();
  };

  const stopRecording = () => {
    Alert.alert(
      'Stop recording?',
      'Your take will finish and you can export or retake. This cannot be undone.',
      [
        { text: 'Keep filming', style: 'cancel' },
        {
          text: 'Stop recording',
          style: 'destructive',
          onPress: () => cameraRef.current?.stopRecording(),
        },
      ],
    );
  };

  const cycleVideoResolution = () => {
    if (isRecording) {
      return;
    }
    const next = nextVideoResolution(videoResolution);
    setVideoResolution(next);
    void saveVideoResolution(next);
  };

  const { width, height } = useWindowDimensions();
  const portraitLayout = height >= width;
  const landscapeLayout = useMemo(
    () => landscapeChromeLayout(deviceOrientation, width, height),
    [deviceOrientation, width, height],
  );

  useEffect(() => {
    if (portraitLayout) {
      return;
    }
    void ScreenOrientation.getOrientationAsync().then(setDeviceOrientation);
  }, [portraitLayout, width, height]);

  const wordsStyle = useMemo(
    () => [
      styles.wordsText,
      portraitLayout ? styles.wordsTextPortrait : styles.wordsTextLandscape,
      {
        fontSize: (portraitLayout ? 28 : 22) * fontScale,
        lineHeight: (portraitLayout ? 36 : 30) * fontScale,
      },
    ],
    [fontScale, portraitLayout],
  );

  const controlRows = (
    <View style={styles.controlRows}>
      <View style={styles.controlCluster}>
        <View style={styles.row}>
          <Pressable
            style={[styles.navButton, styles.navButtonPrev]}
            onPress={() => void goToSlide(slideIndex - 1, false)}
          >
            <Text style={styles.navButtonText}>◀ Prev</Text>
          </Pressable>
          <Pressable
            style={[styles.navButton, styles.navButtonNext]}
            onPress={() => void goToSlide(slideIndex + 1, true)}
          >
            <Text style={styles.navButtonText}>Next ▶</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
          >
            <Text style={styles.secondaryText}>Flip</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setTimedMode((value) => !value)}>
            <Text style={styles.secondaryText}>{timedMode ? 'Timed' : 'Manual'}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={cycleVideoResolution}
            disabled={isRecording}
          >
            <Text style={styles.secondaryText}>{videoResolutionLabel(videoResolution)}</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setFontScale((value) => clamp(value - 0.1, 0.7, 1.8))}
          >
            <Text style={styles.secondaryText}>A-</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setFontScale((value) => clamp(value + 0.1, 0.7, 1.8))}
          >
            <Text style={styles.secondaryText}>A+</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => addHold(5)}>
            <Text style={styles.secondaryText}>+5s</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => addHold(10)}>
            <Text style={styles.secondaryText}>+10s</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.recordSafeZone}>
        <Pressable
          style={[styles.recordButton, styles.recordButtonIsolated, isRecording ? styles.stopButton : null]}
          onPress={isRecording ? stopRecording : startCountdown}
        >
          <Text style={styles.recordText}>{isRecording ? 'Stop' : 'Record'}</Text>
        </Pressable>
      </View>
    </View>
  );

  const landscapeRailButton = (
    label: string,
    onPress: () => void,
    options?: {
      variant?: 'record' | 'stop' | 'back' | 'nav' | 'navNext';
      disabled?: boolean;
    },
  ) => (
    <Pressable
      key={label}
      style={[
        styles.railButton,
        options?.variant === 'back' ? styles.railBackButton : null,
        options?.variant === 'nav' ? styles.railNavButton : null,
        options?.variant === 'navNext' ? styles.railNavButtonNext : null,
        options?.variant === 'record' ? styles.railRecordButton : null,
        options?.variant === 'stop' ? styles.railStopButton : null,
      ]}
      onPress={onPress}
      disabled={options?.disabled}
    >
      <Text
        style={[
          options?.variant === 'record' || options?.variant === 'stop'
            ? styles.railRecordText
            : options?.variant === 'back'
              ? styles.railBackText
              : options?.variant === 'nav' || options?.variant === 'navNext'
                ? styles.railNavText
                : styles.railButtonText,
          options?.disabled ? styles.disabledText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const landscapeControlPad = landscapeLayout ? (
    <View style={[styles.landscapeControlZone, { width: landscapeLayout.controlsZoneWidth }]}>
      <View style={styles.landscapeControlPad}>
        <View style={styles.landscapeControlCluster}>
          <View style={styles.landscapeControlCol}>
            {landscapeRailButton('Back', onBack, { variant: 'back', disabled: isRecording })}
            {landscapeRailButton('◀ Prev', () => void goToSlide(slideIndex - 1, false), {
              variant: 'nav',
            })}
            {landscapeRailButton('Next ▶', () => void goToSlide(slideIndex + 1, true), {
              variant: 'navNext',
            })}
            {landscapeRailButton('Flip', () => setFacing(facing === 'front' ? 'back' : 'front'))}
          </View>
          <View style={styles.landscapeControlCol}>
            {landscapeRailButton(videoResolutionLabel(videoResolution), cycleVideoResolution, {
              disabled: isRecording,
            })}
            {landscapeRailButton(timedMode ? 'Timed' : 'Man', () => setTimedMode((value) => !value))}
            {landscapeRailButton('A-', () => setFontScale((value) => clamp(value - 0.1, 0.7, 1.8)))}
            {landscapeRailButton('A+', () => setFontScale((value) => clamp(value + 0.1, 0.7, 1.8)))}
            {landscapeRailButton('+5', () => addHold(5))}
            {landscapeRailButton('+10', () => addHold(10))}
          </View>
        </View>
        <View style={styles.landscapeRecordSafeZone}>
          {landscapeRailButton(isRecording ? 'Stop' : 'Rec', isRecording ? stopRecording : startCountdown, {
            variant: isRecording ? 'stop' : 'record',
          })}
        </View>
      </View>
    </View>
  ) : null;

  const promptCard = (
    <View style={[styles.promptCard, portraitLayout ? null : styles.promptCardLandscape]}>
      {imageSource ? (
        <Image
          source={{ uri: imageSource }}
          style={[styles.slideImage, portraitLayout ? null : styles.slideImageLandscape]}
        />
      ) : null}

      <View style={styles.wordsPane}>
        <ScrollView contentContainerStyle={styles.paneScroll} nestedScrollEnabled>
          <Text style={wordsStyle}>{slide.body}</Text>
        </ScrollView>
      </View>
    </View>
  );

  const scriptColumn = (
    <View style={styles.scriptColumn}>
      <View style={styles.topBar}>
        {portraitLayout ? (
          <Pressable style={styles.backButton} onPress={onBack} disabled={isRecording || pendingTake !== null}>
            <Text style={[styles.backButtonText, isRecording ? styles.disabledText : null]}>Back</Text>
          </Pressable>
        ) : null}
        <View style={[styles.titlePill, portraitLayout ? null : styles.titlePillLandscape]}>
          <Text style={styles.pillText} numberOfLines={1}>
            {script.title}
          </Text>
        </View>
      </View>

      <View style={styles.slideHeader}>
        <Text style={styles.slideTitle}>{slide.title ?? 'Slide'}</Text>
        <Text style={styles.progress}>
          {progressLabel}
          {isRecording
            ? ` · ${formatClock(recordingClockMs)} · ${slideEventsRef.current.length} slides`
            : ''}
        </Text>
      </View>

      {promptCard}
      {portraitLayout ? controlRows : null}
    </View>
  );

  if (!cameraPermission || !microphonePermission) {
    return <View style={styles.loading} />;
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Text style={styles.permissionTitle}>Turn Outdoor Teleprompter</Text>
        <Text style={styles.permissionCopy}>
          Camera and microphone access are needed so the script can sit on top of the video preview.
        </Text>
        <Pressable style={styles.primaryButton} onPress={requestPermissions}>
          <Text style={styles.primaryButtonText}>Grant permissions</Text>
        </Pressable>
        <Pressable style={styles.backLink} onPress={onBack}>
          <Text style={styles.backLinkText}>Back to scripts</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
        videoQuality={videoResolution}
      />

      <SafeAreaView style={[styles.overlay, portraitLayout ? null : styles.overlayLandscapeRow]}>
        {portraitLayout ? (
          scriptColumn
        ) : landscapeLayout ? (
          <>
            {landscapeLayout.controlsEdge === 'left' ? landscapeControlPad : null}
            {scriptColumn}
            {landscapeLayout.controlsEdge === 'right' ? landscapeControlPad : null}
          </>
        ) : (
          scriptColumn
        )}
      </SafeAreaView>

      {countdown !== null ? (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      ) : null}

      {isRecording ? (
        <View
          style={[
            styles.recordingBadge,
            landscapeLayout?.cameraEdge === 'left' ? styles.recordingBadgeCameraLeft : null,
            landscapeLayout?.cameraEdge === 'right' ? styles.recordingBadgeCameraRight : null,
          ]}
        >
          <Text style={styles.recordingText}>
            REC · {formatClock(recordingClockMs)} · {slideEventsRef.current.length} slide markers
            {holdLabel ? ` · ${holdLabel}` : ''}
          </Text>
        </View>
      ) : null}

      {pendingTake ? (
        <View style={styles.processOverlay}>
          <View style={styles.processCard}>
            <Text style={styles.processTitle}>Take saved on iPhone</Text>
            <Text style={styles.processCopy}>
              {formatClock(pendingTake.durationMs)} · {slideEventsRef.current.length} slide markers
            </Text>
            <Text style={styles.processCopy}>Take: {pendingTake.takeId}</Text>
            <Text style={styles.processCopy}>{script.title}</Text>

            {(() => {
              const preview = toLocalTakeView({
                schemaVersion: 1,
                scriptId: script.id,
                scriptTitle: script.title,
                takeId: pendingTake.takeId,
                recordedAt: pendingTake.recordedAt ?? new Date().toISOString(),
                videoUri: pendingTake.videoUri,
                durationMs: pendingTake.durationMs,
                slideEvents: slideEventsRef.current,
                markers: markersRef.current,
                photoLibraryAssetId: pendingTake.photoLibraryAssetId,
                photoLibraryHint: pendingTake.photoLibraryHint,
                syncStatus: pendingTake.syncStatus ?? 'queued',
              });
              return (
                <>
                  <TakeStepstones steps={preview.steps} />
                  <Text style={styles.processHint}>{preview.statusLabel}</Text>
                  <Text style={styles.processHint}>{preview.metadataSummary}</Text>
                </>
              );
            })()}

            {pendingTake.photoLibraryHint ? (
              <Text style={styles.processHint}>Photos backup: {pendingTake.photoLibraryHint}</Text>
            ) : null}

            <Text style={styles.processHint}>
              Step 1 is done — metadata and video are on this iPhone. Tap Done to see this take on
              the script page. Export to iCloud is step 2; Mac pickup is step 3.
            </Text>

            <Pressable
              style={[styles.processButton, styles.processButtonPrimary]}
              onPress={handleDone}
              disabled={isProcessing}
            >
              <Text style={[styles.processButtonText, styles.processButtonPrimaryText]}>
                Done — view on script page
              </Text>
            </Pressable>

            {canSilentIcloud ? (
              <Pressable
                style={[styles.processButton, isProcessing ? styles.processButtonDisabled : null]}
                onPress={() => void handleProcessTake()}
                disabled={isProcessing}
              >
                <Text style={styles.processButtonText}>
                  {isProcessing ? 'Sending…' : 'Step 2: Send to iCloud inbox'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.processButton, isProcessing ? styles.processButtonDisabled : null]}
                onPress={() => void handleExportToIcloud()}
                disabled={isProcessing}
              >
                <Text style={styles.processButtonText}>
                  {isProcessing ? 'Exporting…' : 'Step 2: Export to iCloud'}
                </Text>
              </Pressable>
            )}

            <Text style={styles.processHintSmall}>
              {canSilentIcloud
                ? 'Dev build writes silently to iCloud outdoor-inbox.'
                : `Pick ${ICLOUD_INBOX_FOLDER} in Files when prompted.`}
            </Text>

            <Pressable
              style={styles.retakeButton}
              onPress={() => void handleRetake()}
              disabled={isProcessing}
            >
              <Text style={styles.retakeButtonText}>Retake</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  loading: {
    flex: 1,
    backgroundColor: '#020617',
  },
  permissionScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#020617',
  },
  permissionTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  permissionCopy: {
    color: '#cbd5e1',
    fontSize: 17,
    lineHeight: 25,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 18,
  },
  backLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  backLinkText: {
    color: '#f97316',
    fontWeight: '800',
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  overlayLandscapeRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 4,
  },
  scriptColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  landscapeControlZone: {
    alignSelf: 'stretch',
    paddingVertical: 4,
  },
  landscapeControlPad: {
    flex: 1,
    flexDirection: 'column',
    gap: 10,
    padding: 4,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  landscapeControlCluster: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 0,
  },
  landscapeControlCol: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 3,
  },
  landscapeRecordSafeZone: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.28)',
    paddingTop: 18,
    marginTop: 4,
  },
  railButton: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    minHeight: 30,
    justifyContent: 'center',
  },
  railBackButton: {
    flex: 0,
    minHeight: 22,
    paddingVertical: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    marginBottom: 4,
  },
  railNavButton: {
    flex: 1.35,
    minHeight: 44,
    paddingVertical: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    borderRadius: 10,
    marginVertical: 2,
  },
  railNavButtonNext: {
    flex: 1.35,
    minHeight: 44,
    paddingVertical: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.94)',
    borderWidth: 1.5,
    borderColor: '#fdba74',
    borderRadius: 10,
    marginVertical: 2,
  },
  railButtonText: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '800',
  },
  railBackText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  railNavText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  railRecordButton: {
    flex: 0,
    minHeight: 56,
    backgroundColor: '#ef4444',
    borderRadius: 12,
  },
  railStopButton: {
    flex: 0,
    minHeight: 56,
    backgroundColor: '#f97316',
    borderRadius: 12,
  },
  railRecordText: {
    color: '#fff7ed',
    fontSize: 20,
    fontWeight: '900',
  },
  titlePillLandscape: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#f97316',
    fontWeight: '800',
    fontSize: 14,
  },
  disabledText: {
    opacity: 0.45,
  },
  titlePill: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pillText: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 14,
  },
  slideHeader: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slideTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: '#000',
    textShadowRadius: 8,
    flex: 1,
  },
  progress: {
    color: '#fde68a',
    fontSize: 14,
    fontWeight: '800',
  },
  promptCard: {
    flex: 1,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.18)',
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    overflow: 'hidden',
    minHeight: 0,
  },
  promptCardLandscape: {
    borderRadius: 16,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    marginBottom: 0,
    marginTop: 6,
  },
  wordsPane: {
    flex: 1,
    minHeight: 0,
  },
  paneScroll: {
    padding: 14,
    paddingBottom: 20,
  },
  wordsText: {
    color: '#f8fafc',
    fontWeight: '800',
    textShadowColor: '#000',
    textShadowRadius: 8,
  },
  wordsTextPortrait: {},
  wordsTextLandscape: {},
  slideImage: {
    width: '100%',
    height: 140,
    resizeMode: 'contain',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  slideImageLandscape: {
    height: 80,
  },
  controlRows: {
    gap: 8,
  },
  controlCluster: {
    gap: 8,
  },
  recordSafeZone: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.28)',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  navButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 2,
    minHeight: 64,
    justifyContent: 'center',
  },
  navButtonPrev: {
    backgroundColor: 'rgba(37, 99, 235, 0.92)',
    borderColor: '#93c5fd',
  },
  navButtonNext: {
    backgroundColor: 'rgba(249, 115, 22, 0.94)',
    borderColor: '#fdba74',
  },
  navButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 30,
    letterSpacing: 0.5,
  },
  recordButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  recordButtonIsolated: {
    width: '72%',
    minWidth: 180,
    minHeight: 58,
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: '#f97316',
  },
  recordText: {
    color: '#fff7ed',
    fontWeight: '900',
    fontSize: 28,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.84)',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 24,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
  },
  countdownText: {
    color: '#fff7ed',
    fontSize: 120,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowRadius: 20,
  },
  recordingBadge: {
    position: 'absolute',
    top: 54,
    right: 18,
    backgroundColor: '#dc2626',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  recordingBadgeCameraLeft: {
    top: 14,
    left: 14,
    right: undefined,
  },
  recordingBadgeCameraRight: {
    top: 14,
    right: 14,
  },
  recordingText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1.5,
    fontSize: 12,
  },
  processOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    paddingHorizontal: 24,
  },
  processCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 20,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  processTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
  },
  processCopy: {
    color: '#cbd5e1',
    fontSize: 18,
    fontWeight: '700',
  },
  processHint: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  processHintSmall: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  processButton: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  processButtonPrimary: {
    backgroundColor: '#f97316',
  },
  processButtonDisabled: {
    opacity: 0.6,
  },
  processButtonText: {
    color: '#052e16',
    fontSize: 22,
    fontWeight: '900',
  },
  processButtonPrimaryText: {
    color: '#111827',
  },
  retakeButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fca5a5',
    fontSize: 18,
    fontWeight: '800',
  },
});
