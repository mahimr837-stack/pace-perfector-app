import { useState, useRef, useCallback, useEffect } from "react";
import { calculateWPM } from "@/utils/speechAnalysis";

export interface WPMSnapshot {
  time: number; // seconds since start
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

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;

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
      if (event.error !== "no-speech") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // ignore
        }
      }
    };

    recognitionRef.current = recognition;
    transcriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setCurrentWPM(0);
    setWpmHistory([]);
    setElapsedSeconds(0);
    setTotalWords(0);
    setPeakWPM(0);
    startTimeRef.current = Date.now();

    recognition.start();
    setIsListening(true);

    timerRef.current = setInterval(updateMetrics, 1000);
  }, [SpeechRecognition, updateMetrics]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsListening(false);
    // Final metrics update
    updateMetrics();
  }, [updateMetrics]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
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
