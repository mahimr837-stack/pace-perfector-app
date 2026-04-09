export const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "actually", "literally", "right", "so", "well"];

export const PACE_THRESHOLDS = {
  good: { min: 100, max: 140 },
  caution: { min: 140, max: 160 },
  fast: { min: 160, max: Infinity },
} as const;

export type PaceLevel = "good" | "caution" | "fast" | "idle";

export function calculateWPM(totalWords: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0 || totalWords <= 0) return 0;
  return Math.round((totalWords / elapsedSeconds) * 60);
}

export function getPaceLevel(wpm: number): PaceLevel {
  if (wpm <= 0) return "idle";
  if (wpm <= PACE_THRESHOLDS.good.max) return "good";
  if (wpm <= PACE_THRESHOLDS.caution.max) return "caution";
  return "fast";
}

export function countFillerWords(transcript: string): Record<string, number> {
  const lower = transcript.toLowerCase();
  const counts: Record<string, number> = {};
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches && matches.length > 0) {
      counts[filler] = matches.length;
    }
  }
  return counts;
}

export function countTotalFillers(fillerCounts: Record<string, number>): number {
  return Object.values(fillerCounts).reduce((sum, c) => sum + c, 0);
}

export function calculateClarityScore(
  transcript: string,
  avgWPM: number,
  fillerCount: number,
  totalWords: number,
  durationSeconds: number
): number {
  if (totalWords < 5) return 0;

  // Pace score: 100 if in good range, decreases as you deviate
  let paceScore = 100;
  if (avgWPM < 80) paceScore = Math.max(0, 100 - (80 - avgWPM) * 2);
  else if (avgWPM > 140) paceScore = Math.max(0, 100 - (avgWPM - 140) * 2);

  // Filler ratio score: penalize filler words
  const fillerRatio = fillerCount / totalWords;
  const fillerScore = Math.max(0, 100 - fillerRatio * 500);

  // Sentence variety: check for varied sentence lengths
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let varietyScore = 70;
  if (sentences.length >= 3) {
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
    varietyScore = Math.min(100, 50 + Math.sqrt(variance) * 10);
  }

  // Consistency: penalize extreme WPM variation would be here, but simplified
  const consistencyScore = avgWPM > 0 ? Math.min(100, 80 + Math.min(20, durationSeconds / 5)) : 0;

  const score = Math.round(paceScore * 0.35 + fillerScore * 0.3 + varietyScore * 0.15 + consistencyScore * 0.2);
  return Math.max(0, Math.min(100, score));
}

export function getCoachingMessage(wpm: number): string | null {
  if (wpm > 180) return "Take a breath 🫁";
  if (wpm > 160) return "Slow down ✋";
  if (wpm > 150) return "Pause between sentences";
  return null;
}

export function getImprovementTips(
  avgWPM: number,
  peakWPM: number,
  fillerCount: number,
  clarityScore: number
): string[] {
  const tips: string[] = [];
  if (avgWPM > 160) tips.push("Your average pace was too fast. Try to speak at 120–140 WPM for clarity.");
  else if (avgWPM > 140) tips.push("Your pace was slightly fast. Aim for 120–140 WPM.");
  else if (avgWPM < 80) tips.push("You spoke quite slowly. A natural pace is 100–140 WPM.");

  if (peakWPM > 180) tips.push(`You peaked at ${peakWPM} WPM. Try to stay below 160 WPM.`);

  if (fillerCount > 5) tips.push(`You used ${fillerCount} filler words. Practice replacing them with pauses.`);
  else if (fillerCount > 0) tips.push("Good job keeping filler words low! Keep practicing.");

  if (clarityScore < 50) tips.push("Try varying your sentence length and adding pauses for better clarity.");
  if (tips.length === 0) tips.push("Great job! Keep practicing to maintain consistency.");
  return tips;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
