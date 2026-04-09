import { useState, useRef, useCallback, useEffect } from "react";
import { calculateWPM } from "@/utils/speechAnalysis";

export interface WPMSnapshot {
  time: number;
  wpm: number;
}

export interface FinalSessionData {
  transcript: string;
  totalWords: number;
  elapsedSeconds: number;
  currentWPM: number;
  peakWPM: number;
  wpmHistory: WPMSnapshot[];
}

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  currentWPM: number;
  wpmHistory: WPMSnapshot[];
  elapsedSeconds: number;
  totalWords: number;
  peakWPM: number;
  startListening: () => void;
  stopListening: () => FinalSessionData;
  isSupported: boolean;
}

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [currentWPM, setCurrentWPM] = useState(0);
  const [wpmHistory, setWpmHistory] = useState<WPMSnapshot[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [peakWPM, setPeakWPM] = useState(0);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const startTimeRef = useRef(0);
  const shouldRestartRef = useRef(false);
  const mountedRef = useRef(false);
  const activeSessionIdRef = useRef(0);

  const accumulatedTranscriptRef = useRef("");
  const currentSessionFinalRef = useRef("");
  const interimTranscriptRef = useRef("");
  const wpmHistoryRef = useRef<WPMSnapshot[]>([]);
  const peakWPMRef = useRef(0);
  const lastSnapshotTimeRef = useRef(-1);

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  const isSessionActive = useCallback((sessionId: number) => {
    return mountedRef.current && activeSessionIdRef.current === sessionId;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = undefined;
    }
  }, []);

  const clearRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const getFullTranscript = useCallback(() => {
    return [
      accumulatedTranscriptRef.current,
      currentSessionFinalRef.current,
      interimTranscriptRef.current,
    ]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const getCommittedTranscript = useCallback(() => {
    return [accumulatedTranscriptRef.current, currentSessionFinalRef.current]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const updateMetrics = useCallback(
    (sessionId: number) => {
      if (!isSessionActive(sessionId)) return;

      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      const roundedElapsed = Math.floor(elapsed);
      const fullTranscript = getFullTranscript();
      const words = fullTranscript.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const wpm = calculateWPM(wordCount, elapsed);

      if (wpm > peakWPMRef.current) {
        peakWPMRef.current = wpm;
      }

      if (roundedElapsed > lastSnapshotTimeRef.current && roundedElapsed > 0) {
        lastSnapshotTimeRef.current = roundedElapsed;
        wpmHistoryRef.current = [
          ...wpmHistoryRef.current,
          { time: roundedElapsed, wpm },
        ];
      }

      if (!isSessionActive(sessionId)) return;

      setElapsedSeconds(elapsed);
      setTotalWords(wordCount);
      setCurrentWPM(wpm);
      setPeakWPM(peakWPMRef.current);
      setWpmHistory(wpmHistoryRef.current);

      console.log("Transcript:", fullTranscript);
      console.log("Elapsed:", elapsed);
      console.log("WPM:", wpm);
      console.log("WPM History:", wpmHistoryRef.current);
    },
    [getFullTranscript, isSessionActive]
  );

  const createRecognition = useCallback(
    (sessionId: number) => {
      if (!SpeechRecognition) return null;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "bn-BD";

      recognition.onresult = (event: any) => {
        if (!isSessionActive(sessionId)) return;

        let sessionFinal = "";
        let interim = "";

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            sessionFinal += `${result[0].transcript} `;
          } else {
            interim += result[0].transcript;
          }
        }

        currentSessionFinalRef.current = sessionFinal;
        interimTranscriptRef.current = interim;
        const fullTranscript = getFullTranscript();
        const committedTranscript = getCommittedTranscript();

        if (!isSessionActive(sessionId)) return;

        setTranscript(committedTranscript);
        setInterimTranscript(interim);
        console.log("Transcript:", fullTranscript);
      };

      recognition.onerror = (event: any) => {
        if (!isSessionActive(sessionId)) return;

        console.error("Speech recognition error:", event.error);

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          shouldRestartRef.current = false;
          clearTimer();
          if (!isSessionActive(sessionId)) return;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (activeSessionIdRef.current !== sessionId) return;

        accumulatedTranscriptRef.current = [
          accumulatedTranscriptRef.current,
          currentSessionFinalRef.current,
          interimTranscriptRef.current,
        ]
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        currentSessionFinalRef.current = "";
        interimTranscriptRef.current = "";

        if (!shouldRestartRef.current || !mountedRef.current) return;

        clearRestartTimeout();
        restartTimeoutRef.current = setTimeout(() => {
          if (!shouldRestartRef.current || !isSessionActive(sessionId)) return;

          try {
            const newRecognition = createRecognition(sessionId);
            if (!newRecognition || !isSessionActive(sessionId)) return;
            recognitionRef.current = newRecognition;
            newRecognition.start();
          } catch (error: any) {
            console.error("Failed to restart recognition:", error);
            if (error?.name === "NotAllowedError") {
              shouldRestartRef.current = false;
              clearTimer();
              if (!isSessionActive(sessionId)) return;
              setIsListening(false);
            }
          }
        }, 300);
      };

      return recognition;
    },
    [SpeechRecognition, clearRestartTimeout, clearTimer, getFullTranscript, isSessionActive]
  );

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;

    activeSessionIdRef.current += 1;
    const sessionId = activeSessionIdRef.current;

    shouldRestartRef.current = false;
    clearRestartTimeout();
    clearTimer();
    clearRecognition();

    accumulatedTranscriptRef.current = "";
    currentSessionFinalRef.current = "";
    interimTranscriptRef.current = "";
    wpmHistoryRef.current = [];
    peakWPMRef.current = 0;
    lastSnapshotTimeRef.current = -1;
    startTimeRef.current = Date.now();

    setTranscript("");
    setInterimTranscript("");
    setCurrentWPM(0);
    setWpmHistory([]);
    setElapsedSeconds(0);
    setTotalWords(0);
    setPeakWPM(0);

    const recognition = createRecognition(sessionId);
    if (!recognition) return;

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;

    try {
      recognition.start();
      if (!isSessionActive(sessionId)) return;
      setIsListening(true);
      timerRef.current = setInterval(() => updateMetrics(sessionId), 1000);
    } catch (error) {
      console.error("Failed to start recognition:", error);
      recognitionRef.current = null;
      shouldRestartRef.current = false;
      clearTimer();
      if (!isSessionActive(sessionId)) return;
      setIsListening(false);
    }
  }, [SpeechRecognition, clearRecognition, clearRestartTimeout, clearTimer, createRecognition, isSessionActive, updateMetrics]);

  const stopListening = useCallback((): FinalSessionData => {
    const sessionId = activeSessionIdRef.current;
    shouldRestartRef.current = false;
    clearRestartTimeout();
    clearTimer();
    clearRecognition();

    const finalTranscript = getFullTranscript();
    const finalElapsed = (Date.now() - startTimeRef.current) / 1000;
    const words = finalTranscript.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const finalWPM = calculateWPM(wordCount, finalElapsed);

    if (finalWPM > peakWPMRef.current) {
      peakWPMRef.current = finalWPM;
    }

    const roundedElapsed = Math.round(finalElapsed);
    if (roundedElapsed > lastSnapshotTimeRef.current && roundedElapsed > 0) {
      wpmHistoryRef.current = [
        ...wpmHistoryRef.current,
        { time: roundedElapsed, wpm: finalWPM },
      ];
      lastSnapshotTimeRef.current = roundedElapsed;
    }

    if (isSessionActive(sessionId)) {
      setIsListening(false);
      setTranscript(finalTranscript);
      setInterimTranscript("");
      interimTranscriptRef.current = "";
      setElapsedSeconds(finalElapsed);
      setTotalWords(wordCount);
      setCurrentWPM(finalWPM);
      setPeakWPM(peakWPMRef.current);
      setWpmHistory(wpmHistoryRef.current);
    }

    const finalData: FinalSessionData = {
      transcript: finalTranscript,
      totalWords: wordCount,
      elapsedSeconds: finalElapsed,
      currentWPM: finalWPM,
      peakWPM: peakWPMRef.current,
      wpmHistory: wpmHistoryRef.current,
    };

    console.log("Final session:", finalData);
    return finalData;
  }, [clearRecognition, clearRestartTimeout, clearTimer, getFullTranscript, isSessionActive]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      shouldRestartRef.current = false;
      activeSessionIdRef.current += 1;
      clearRestartTimeout();
      clearTimer();
      clearRecognition();
    };
  }, [clearRecognition, clearRestartTimeout, clearTimer]);

  return {
    isListening,
    transcript,
    interimTranscript,
    currentWPM,
    wpmHistory,
    elapsedSeconds,
    totalWords,
    peakWPM,
    startListening,
    stopListening,
    isSupported,
  };
}
