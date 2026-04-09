import { useState, useRef, useCallback, useEffect } from "react";
import { calculateWPM } from "@/utils/speechAnalysis";

export interface WPMSnapshot {
  time: number;
  wpm: number;
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
  stopListening: () => void;
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
  const transcriptRef = useRef("");
  const shouldRestartRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const SpeechRecognition = typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

  const isSupported = !!SpeechRecognition;

  const updateMetrics = useCallback(() => {
    const now = Date.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    setElapsedSeconds(elapsed);

    const words = transcriptRef.current.trim().split(/\s+/).filter(w => w.length > 0).length;
    setTotalWords(words);

    const wpm = calculateWPM(words, elapsed);
    setCurrentWPM(wpm);
    setPeakWPM(prev => Math.max(prev, wpm));

    setWpmHistory(prev => [...prev, { time: Math.round(elapsed), wpm }]);
  }, []);

  const createRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "bn-BD";

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      transcriptRef.current = final;
      setTranscript(final);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldRestartRef.current = false;
        setIsListening(false);
      }
      // For "no-speech" or "network" errors, let onend handle restart
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        // Delay restart to avoid rapid start/stop cycles that crash the tab
        restartTimeoutRef.current = setTimeout(() => {
          if (!shouldRestartRef.current) return;
          try {
            const newRec = createRecognition();
            if (newRec) {
              recognitionRef.current = newRec;
              newRec.start();
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

  const startListening = useCallback(async () => {
    if (!SpeechRecognition) return;

    // Check microphone permission first
    try {
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (status.state === "denied") {
          console.error("Microphone permission denied");
          return;
        }
      }
    } catch {
      // permissions API may not be available
    }

    // Clean up any existing recognition
    shouldRestartRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    // Reset state
    transcriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setCurrentWPM(0);
    setWpmHistory([]);
    setElapsedSeconds(0);
    setTotalWords(0);
    setPeakWPM(0);
    startTimeRef.current = Date.now();

    // Small delay to ensure previous recognition is fully cleaned up
    await new Promise(resolve => setTimeout(resolve, 200));

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;

    try {
      recognition.start();
      setIsListening(true);
      timerRef.current = setInterval(updateMetrics, 1000);
    } catch (e) {
      console.error("Failed to start recognition:", e);
      recognitionRef.current = null;
      shouldRestartRef.current = false;
    }
  }, [SpeechRecognition, createRecognition, updateMetrics]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsListening(false);
    updateMetrics();
  }, [updateMetrics]);

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
