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
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  // KEY FIX: accumulate transcript across recognition restarts
  const accumulatedTranscriptRef = useRef("");
  const currentSessionFinalRef = useRef("");
  const shouldRestartRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const wpmHistoryRef = useRef<WPMSnapshot[]>([]);
  const peakWPMRef = useRef(0);
  const lastSnapshotTimeRef = useRef(-1);

  const SpeechRecognition = typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

  const isSupported = !!SpeechRecognition;

  const getFullTranscript = useCallback(() => {
    return (accumulatedTranscriptRef.current + currentSessionFinalRef.current).trim();
  }, []);

  const updateMetrics = useCallback(() => {
    const now = Date.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    const roundedElapsed = Math.floor(elapsed);
    setElapsedSeconds(elapsed);

    const fullText = getFullTranscript();
    const words = fullText.split(/\s+/).filter(w => w.length > 0).length;
    setTotalWords(words);

    const wpm = calculateWPM(words, elapsed);
    setCurrentWPM(wpm);

    if (wpm > peakWPMRef.current) {
      peakWPMRef.current = wpm;
    }
    setPeakWPM(peakWPMRef.current);

    // Only add one snapshot per second
    if (roundedElapsed > lastSnapshotTimeRef.current && roundedElapsed > 0) {
      lastSnapshotTimeRef.current = roundedElapsed;
      const snapshot: WPMSnapshot = { time: roundedElapsed, wpm };
      wpmHistoryRef.current = [...wpmHistoryRef.current, snapshot];
      setWpmHistory(wpmHistoryRef.current);
    }

    console.log("📊 Metrics — Words:", words, "Elapsed:", elapsed.toFixed(1), "WPM:", wpm, "Peak:", peakWPMRef.current, "Transcript:", fullText.substring(0, 60));
  }, [getFullTranscript]);

  const createRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "bn-BD";

    recognition.onresult = (event: any) => {
      let sessionFinal = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          sessionFinal += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      // Update current session's final text (will be accumulated on restart)
      currentSessionFinalRef.current = sessionFinal;
      const fullText = accumulatedTranscriptRef.current + sessionFinal;
      setTranscript(fullText);
      setInterimTranscript(interim);
      console.log("🎤 Transcript:", fullText.substring(0, 80), "| Interim:", interim.substring(0, 40));
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldRestartRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // KEY FIX: accumulate the final transcript from this session before restarting
      accumulatedTranscriptRef.current += currentSessionFinalRef.current;
      currentSessionFinalRef.current = "";

      if (shouldRestartRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          if (!shouldRestartRef.current) return;
          try {
            const newRec = createRecognition();
            if (newRec) {
              recognitionRef.current = newRec;
              newRec.start();
              console.log("🔄 Recognition restarted, accumulated:", accumulatedTranscriptRef.current.substring(0, 60));
            }
          } catch (e: any) {
            console.error("Failed to restart recognition:", e);
            if (e.name === "NotAllowedError") {
              shouldRestartRef.current = false;
              setIsListening(false);
            }
          }
        }, 300);
      }
    };

    return recognition;
  }, [SpeechRecognition]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;

    shouldRestartRef.current = false;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    // Reset all state
    accumulatedTranscriptRef.current = "";
    currentSessionFinalRef.current = "";
    wpmHistoryRef.current = [];
    peakWPMRef.current = 0;
    lastSnapshotTimeRef.current = -1;
    setTranscript("");
    setInterimTranscript("");
    setCurrentWPM(0);
    setWpmHistory([]);
    setElapsedSeconds(0);
    setTotalWords(0);
    setPeakWPM(0);
    startTimeRef.current = Date.now();

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;

    try {
      recognition.start();
      setIsListening(true);
      timerRef.current = setInterval(updateMetrics, 1000);
      console.log("▶️ Recording started");
    } catch (e) {
      console.error("Failed to start recognition:", e);
      recognitionRef.current = null;
      shouldRestartRef.current = false;
    }
  }, [SpeechRecognition, createRecognition, updateMetrics]);

  const stopListening = useCallback((): FinalSessionData => {
    shouldRestartRef.current = false;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsListening(false);

    // Compute final values from refs
    const finalTranscript = (accumulatedTranscriptRef.current + currentSessionFinalRef.current).trim();
    const finalElapsed = (Date.now() - startTimeRef.current) / 1000;
    const words = finalTranscript.split(/\s+/).filter(w => w.length > 0).length;
    const finalWPM = calculateWPM(words, finalElapsed);

    if (finalWPM > peakWPMRef.current) peakWPMRef.current = finalWPM;

    // Add final snapshot
    const roundedElapsed = Math.round(finalElapsed);
    if (roundedElapsed > lastSnapshotTimeRef.current) {
      const finalSnapshot: WPMSnapshot = { time: roundedElapsed, wpm: finalWPM };
      wpmHistoryRef.current = [...wpmHistoryRef.current, finalSnapshot];
    }

    const finalData: FinalSessionData = {
      transcript: finalTranscript,
      totalWords: words,
      elapsedSeconds: finalElapsed,
      currentWPM: finalWPM,
      peakWPM: peakWPMRef.current,
      wpmHistory: wpmHistoryRef.current,
    };

    console.log("🛑 Final session:", JSON.stringify(finalData, null, 2));

    // Update state for UI
    setTranscript(finalTranscript);
    setElapsedSeconds(finalElapsed);
    setTotalWords(words);
    setCurrentWPM(finalWPM);
    setPeakWPM(peakWPMRef.current);
    setWpmHistory(wpmHistoryRef.current);

    return finalData;
  }, []);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
