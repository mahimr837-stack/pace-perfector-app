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
  const transcriptRef = useRef("");
  const shouldRestartRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const wpmHistoryRef = useRef<WPMSnapshot[]>([]);
  const peakWPMRef = useRef(0);

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

    if (wpm > peakWPMRef.current) {
      peakWPMRef.current = wpm;
    }
    setPeakWPM(peakWPMRef.current);

    const snapshot: WPMSnapshot = { time: Math.round(elapsed), wpm };
    wpmHistoryRef.current = [...wpmHistoryRef.current, snapshot];
    setWpmHistory(wpmHistoryRef.current);

    console.log("📊 Metrics update — Words:", words, "Elapsed:", elapsed.toFixed(1), "WPM:", wpm, "Peak:", peakWPMRef.current);
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
      console.log("🎤 Transcript updated:", final.substring(0, 80));
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldRestartRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
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

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;

    shouldRestartRef.current = false;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    transcriptRef.current = "";
    wpmHistoryRef.current = [];
    peakWPMRef.current = 0;
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
    } catch (e) {
      console.error("Failed to start recognition:", e);
      recognitionRef.current = null;
      shouldRestartRef.current = false;
    }
  }, [SpeechRecognition, createRecognition, updateMetrics]);

  // Returns final computed data directly from refs (not stale state)
  const stopListening = useCallback((): FinalSessionData => {
    shouldRestartRef.current = false;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsListening(false);

    // Compute final values from refs (avoids stale state issue)
    const finalTranscript = transcriptRef.current;
    const finalElapsed = (Date.now() - startTimeRef.current) / 1000;
    const words = finalTranscript.trim().split(/\s+/).filter(w => w.length > 0).length;
    const finalWPM = calculateWPM(words, finalElapsed);

    if (finalWPM > peakWPMRef.current) peakWPMRef.current = finalWPM;

    // Add final snapshot
    const finalSnapshot: WPMSnapshot = { time: Math.round(finalElapsed), wpm: finalWPM };
    wpmHistoryRef.current = [...wpmHistoryRef.current, finalSnapshot];

    const finalData: FinalSessionData = {
      transcript: finalTranscript,
      totalWords: words,
      elapsedSeconds: finalElapsed,
      currentWPM: finalWPM,
      peakWPM: peakWPMRef.current,
      wpmHistory: wpmHistoryRef.current,
    };

    console.log("🛑 Final session data:", finalData);

    // Update state for UI
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
