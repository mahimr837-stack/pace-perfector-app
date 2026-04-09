import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MicButton } from "@/components/MicButton";
import { SpeedIndicator } from "@/components/SpeedIndicator";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  getPaceLevel,
  getCoachingMessage,
  formatDuration,
  countFillerWords,
  countTotalFillers,
  calculateClarityScore,
  getImprovementTips,
  calculateWPM,
} from "@/utils/speechAnalysis";
import { addSession, type SessionData } from "@/utils/sessionStorage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomeScreen() {
  const navigate = useNavigate();
  const {
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
    recognitionStatus,
  } = useSpeechRecognition();

  const [coachingMessage, setCoachingMessage] = useState<string | null>(null);
  const lastVibrationRef = useRef(0);

  // Test mode: simulate a session with sample data
  const handleTestMode = useCallback(() => {
    const testTranscript = "um hello uh everyone today I want to like explain algebra like a teacher you know it is basically very important actually";
    const testElapsed = 15;
    const testWords = testTranscript.split(/\s+/).filter(Boolean).length;
    const testWPM = calculateWPM(testWords, testElapsed);
    const fillerCounts = countFillerWords(testTranscript);
    const totalFillers = countTotalFillers(fillerCounts);
    const clarityScore = calculateClarityScore(testTranscript, testWPM, totalFillers, testWords, testElapsed);
    const tips = getImprovementTips(testWPM, testWPM + 20, totalFillers, clarityScore);

    const testHistory = Array.from({ length: testElapsed }, (_, i) => ({
      time: i + 1,
      wpm: Math.round(testWPM + (Math.random() - 0.5) * 30),
    }));

    const session: SessionData = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      durationSeconds: testElapsed,
      avgWPM: testWPM,
      peakWPM: testWPM + 20,
      totalWords: testWords,
      clarityScore,
      fillerCounts,
      transcript: testTranscript,
      wpmHistory: testHistory,
      tips,
    };

    console.log("🧪 Test session:", session);
    addSession(session);
    navigate(`/results/${session.id}`);
  }, [navigate]);

  const paceLevel = getPaceLevel(currentWPM);

  // Coaching messages & haptic feedback
  useEffect(() => {
    if (!isListening) {
      setCoachingMessage(null);
      return;
    }
    const msg = getCoachingMessage(currentWPM);
    setCoachingMessage(msg);

    // Haptic feedback with 5s cooldown
    if (currentWPM > 160 && navigator.vibrate) {
      const now = Date.now();
      if (now - lastVibrationRef.current > 5000) {
        navigator.vibrate(200);
        lastVibrationRef.current = now;
      }
    }
  }, [currentWPM, isListening]);

  const handleToggle = useCallback(() => {
    if (isListening) {
      // stopListening returns final data computed from refs (not stale state)
      const finalData = stopListening();
      
      const avgWPM = calculateWPM(finalData.totalWords, finalData.elapsedSeconds);
      const fillerCounts = countFillerWords(finalData.transcript);
      const totalFillers = countTotalFillers(fillerCounts);
      const clarityScore = calculateClarityScore(finalData.transcript, avgWPM, totalFillers, finalData.totalWords, finalData.elapsedSeconds);
      const tips = getImprovementTips(avgWPM, finalData.peakWPM, totalFillers, clarityScore);

      const session: SessionData = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        durationSeconds: finalData.elapsedSeconds,
        avgWPM,
        peakWPM: finalData.peakWPM,
        totalWords: finalData.totalWords,
        clarityScore,
        fillerCounts,
        transcript: finalData.transcript,
        wpmHistory: finalData.wpmHistory,
        tips,
      };

      console.log("💾 Saving session:", session);
      addSession(session);
      navigate(`/results/${session.id}`);
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pb-8 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Speech Coach</h1>
          <p className="text-sm text-muted-foreground">Practice speaking clearly</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate("/history")}>
          <History className="w-5 h-5" />
        </Button>
      </div>

      {!isSupported && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
          Speech recognition is not supported in this browser. Please use Chrome or Edge.
        </div>
      )}

      {/* Debug: recognition status */}
      {isListening && recognitionStatus && (
        <div className="mb-2 px-3 py-1 rounded bg-muted text-xs text-muted-foreground text-center">
          Status: {recognitionStatus}
        </div>
      )}

      {/* Speed Indicator */}
      <div className="mb-6">
        <SpeedIndicator wpm={currentWPM} paceLevel={paceLevel} />
      </div>

      {/* Coaching Banner */}
      <div className="h-10 mb-6 flex items-center">
        <FeedbackBanner message={coachingMessage} />
      </div>

      {/* Mic Button */}
      <div className="mb-6">
        <MicButton isListening={isListening} onToggle={handleToggle} disabled={!isSupported} />
      </div>

      {/* Timer & Word Count */}
      {isListening && (
        <div className="flex gap-6 mb-4 text-sm text-muted-foreground">
          <span className="tabular-nums">{formatDuration(elapsedSeconds)}</span>
          <span>{totalWords} words</span>
        </div>
      )}

      {/* Live Transcript */}
      {(transcript || interimTranscript) && (
        <div className="w-full flex-1 min-h-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Live Transcript</p>
          <ScrollArea className="h-40 w-full rounded-lg border bg-card p-3">
            <p className="text-sm text-foreground leading-relaxed">
              {transcript}
              {interimTranscript && (
                <span className="text-muted-foreground italic">{interimTranscript}</span>
              )}
            </p>
          </ScrollArea>
        </div>
      )}

      {/* Tap to start hint */}
      {!isListening && !transcript && (
        <div className="flex flex-col items-center gap-3 mt-4">
          <p className="text-muted-foreground text-sm">Tap the microphone to start</p>
          <Button variant="outline" size="sm" onClick={handleTestMode}>
            🧪 Test Mode (Sample Data)
          </Button>
        </div>
      )}
    </div>
  );
}
