import { useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  metering: number;
  uri: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    metering: -160,
    uri: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) throw new Error("Permission not granted");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          android: {
            extension: ".m4a",
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: ".m4a",
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          web: {},
          isMeteringEnabled: true,
        },
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            setState((s) => ({ ...s, metering: status.metering ?? -160 }));
          }
        },
        100
      );

      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current;
        setState((s) => ({ ...s, duration: Math.floor(elapsed / 1000) }));
      }, 200);

      setState((s) => ({ ...s, isRecording: true, isPaused: false, uri: null, duration: 0 }));
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    await recordingRef.current.pauseAsync();
    if (timerRef.current) clearInterval(timerRef.current);
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resumeRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    await recordingRef.current.startAsync();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current;
      setState((s) => ({ ...s, duration: Math.floor(elapsed / 1000) }));
    }, 200);

    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return null;

    if (timerRef.current) clearInterval(timerRef.current);

    await recordingRef.current.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const uri = recordingRef.current.getURI();
    recordingRef.current = null;

    setState((s) => ({
      ...s,
      isRecording: false,
      isPaused: false,
      uri,
      metering: -160,
    }));

    return uri;
  }, []);

  const resetRecording = useCallback(() => {
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      metering: -160,
      uri: null,
    });
  }, []);

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  };
}
