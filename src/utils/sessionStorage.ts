import type { WPMSnapshot } from "@/hooks/useSpeechRecognition";

export interface SessionData {
  id: string;
  date: string;
  durationSeconds: number;
  avgWPM: number;
  peakWPM: number;
  totalWords: number;
  clarityScore: number;
  fillerCounts: Record<string, number>;
  transcript: string;
  wpmHistory: WPMSnapshot[];
  tips: string[];
}

const STORAGE_KEY = "speech-coach-sessions";

export function saveSessions(sessions: SessionData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function loadSessions(): SessionData[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addSession(session: SessionData): void {
  const sessions = loadSessions();
  sessions.unshift(session);
  saveSessions(sessions);
}

export function deleteSession(id: string): void {
  const sessions = loadSessions().filter(s => s.id !== id);
  saveSessions(sessions);
}
