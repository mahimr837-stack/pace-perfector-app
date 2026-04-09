
# Speech Coach — PWA with Light & Clean Design

## Overview
A mobile-first web app (installable PWA) that listens to speech in real time and coaches users on speaking pace, clarity, and filler word usage. Light, clean design with large readable text and green/yellow/red color feedback.

## Screens

### 1. Home Screen (Recording)
- Large centered microphone button (one-tap start/stop)
- Real-time WPM display with color-coded circle indicator (🟢 100–140, 🟡 140–160, 🔴 160+)
- Live transcript scrolling below
- Subtle coaching prompts appear when speaking too fast ("Slow down", "Take a breath")
- Elapsed time display
- Haptic vibration (via Vibration API) when WPM > 160, with 5-second cooldown

### 2. Results Screen (Post-Speech Analysis)
- Average WPM, Peak WPM, Total Duration
- Clarity Score (0–100) based on sentence length, pauses, repetition
- Filler word count breakdown ("um", "uh", "like", "you know")
- Speed-over-time line chart with green/yellow/red zones highlighted
- Personalized improvement tips
- Option to save session locally

### 3. History Screen
- List of past sessions with date, duration, average WPM, clarity score
- Tap to view full session details

## Technical Approach
- **Speech Recognition**: Web Speech API (SpeechRecognition) for real-time transcription
- **WPM Calculation**: `(totalWords / elapsedSeconds) * 60`, updated every second
- **Filler Detection**: Match transcript words against filler word list
- **Clarity Score**: Simple heuristic (sentence variety, pause frequency, filler ratio, consistency)
- **Charts**: Recharts for speed-over-time visualization
- **Local Storage**: Save sessions via localStorage
- **PWA**: Simple manifest.json for installability (no service worker needed)
- **Haptic Feedback**: `navigator.vibrate()` with cooldown timer

## Key Components
- `MicButton` — animated record/stop button
- `SpeedIndicator` — color-coded WPM gauge
- `FeedbackBanner` — coaching prompts with smooth fade animations
- `SpeedChart` — line chart of WPM over time
- `SessionCard` — summary card for history list

## Design
- Light background, soft shadows, rounded cards
- Green (#22C55E), Yellow (#EAB308), Red (#EF4444) for pace feedback
- Large, bold WPM number (easily readable at a glance)
- Smooth color transitions and subtle animations
- Mobile-first responsive layout
