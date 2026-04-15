// ─────────────────────────────────────────────────────────────
// /Agents/voiceSignalExtractor.js
// Extracts voice quality signals from Whisper verbose_json output
// Pure JS — zero API calls — runs free on server after Whisper returns
//
// INPUT:  Whisper verbose_json response + audio duration in seconds
// OUTPUT: voiceSignal object injected into GPT-4o judge context
// ─────────────────────────────────────────────────────────────

// ── CONFIG ───────────────────────────────────────────────────
const FILLER_WORDS = [
  "um", "uh", "like", "you know", "basically",
  "literally", "right", "so", "actually", "kind of"
];

// A pause before the first word of a sentence = thinking (GOOD)
const THINKING_PAUSE_THRESHOLD  = 1.0; // seconds

// A pause inside a sentence = hesitation (BAD)
const HESITATION_PAUSE_THRESHOLD = 0.6; // seconds

// Characters that mark the end of a sentence
const SENTENCE_END_CHARS = [".", "?", "!"];

// ── GUARDRAIL: min transcript length ─────────────────────────
const MIN_WORD_COUNT = 5; // below this = treat as empty response

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// @param {Object} whisperResponse  - full verbose_json from Whisper API
// @param {number} audioDurationSec - total audio duration in seconds
// @returns {Object} voiceSignal
// ─────────────────────────────────────────────────────────────
export function extractVoiceSignals(whisperResponse, audioDurationSec) {
  const words      = whisperResponse.words || [];
  const transcript = (whisperResponse.text || "").trim();

  // ── GUARDRAIL: empty or too-short response ────────────────
  const wordCount = transcript.split(" ").filter(Boolean).length;
  if (words.length === 0 || wordCount < MIN_WORD_COUNT) {
    return buildEmptySignal(transcript);
  }

  // Step 1 — words per minute
  const wpm = calculateWPM(words, audioDurationSec);

  // Step 2 — filler word count
  const fillerCount = countFillerWords(transcript);

  // Step 3 — classify pauses into thinking vs hesitation
  const { thinkingPauses, hesitationPauses } = classifyPauses(words);

  // Step 4 — build enriched transcript with inline pause + filler markers
  // This is what gets sent to GPT-4o as context
  const enrichedTranscript = buildEnrichedTranscript(words);

  // Step 5 — generate a plain-English summary for LLM context
  const summary = generateSummary(wpm, fillerCount, thinkingPauses, hesitationPauses);

  return {
    wpm:                  Math.round(wpm),
    filler_count:         fillerCount,
    thinking_pauses:      thinkingPauses,
    hesitation_pauses:    hesitationPauses,
    enriched_transcript:  enrichedTranscript,
    summary,
  };
}

// ─────────────────────────────────────────────────────────────
// STEP 1 — Words per minute
// Uses actual first-word and last-word timestamps for accuracy
// ─────────────────────────────────────────────────────────────
function calculateWPM(words, audioDurationSec) {
  if (!audioDurationSec || audioDurationSec <= 0) return 0;

  // Use actual speech duration (last word end - first word start)
  // More accurate than total audio duration which includes silence
  const speechDuration = words[words.length - 1].end - words[0].start;
  const durationToUse  = speechDuration > 0 ? speechDuration : audioDurationSec;
  const minutes        = durationToUse / 60;

  return words.length / minutes;
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — Filler word count
// Uses word boundary regex to avoid partial matches
// e.g. "like" in "likewise" should NOT count
// ─────────────────────────────────────────────────────────────
function countFillerWords(transcript) {
  const lower = transcript.toLowerCase();
  return FILLER_WORDS.reduce((count, filler) => {
    const regex   = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = lower.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

// ─────────────────────────────────────────────────────────────
// STEP 3 — KEY FUNCTION: Pause classifier
//
// Whisper verbose_json gives us word-level timestamps:
//   words: [{ word: "so", start: 0.2, end: 0.4 }, ...]
//
// We measure the gap between consecutive words.
// Where that gap falls in the sentence determines its type:
//
//   THINKING pause  → gap appears at START of a sentence
//                     (candidate paused to think before answering)
//                     → POSITIVE signal
//
//   HESITATION pause → gap appears MID-SENTENCE
//                      (candidate lost their train of thought)
//                      → NEGATIVE signal
// ─────────────────────────────────────────────────────────────
function classifyPauses(words) {
  let thinkingPauses   = 0;
  let hesitationPauses = 0;
  let isStartOfSentence = true; // first word is always start of sentence

  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1];
    const currWord = words[i];
    const gap      = currWord.start - prevWord.end; // gap in seconds

    if (gap <= 0) {
      // No gap — update sentence boundary and continue
      const prevText = prevWord.word.trim();
      isStartOfSentence = SENTENCE_END_CHARS.some(c => prevText.endsWith(c));
      continue;
    }

    if (isStartOfSentence && gap >= THINKING_PAUSE_THRESHOLD) {
      // Pause at sentence start = thinking pause (good)
      thinkingPauses++;
    } else if (!isStartOfSentence && gap >= HESITATION_PAUSE_THRESHOLD) {
      // Pause mid-sentence = hesitation pause (bad)
      hesitationPauses++;
    }

    // Check if previous word ended a sentence
    // If so, next pause will be classified as thinking
    const prevText        = prevWord.word.trim();
    isStartOfSentence     = SENTENCE_END_CHARS.some(c => prevText.endsWith(c));
  }

  return { thinkingPauses, hesitationPauses };
}

// ─────────────────────────────────────────────────────────────
// STEP 4 — Enriched transcript
// Inserts inline markers for pauses and filler words
// Example: "so [pause 2.1s] the student [um] should try..."
// GPT-4o reads this and understands delivery quality in context
// ─────────────────────────────────────────────────────────────
function buildEnrichedTranscript(words) {
  let enriched = "";

  for (let i = 0; i < words.length; i++) {
    const word     = words[i];
    const wordText = word.word.trim();

    // Insert pause marker if gap from previous word is significant
    if (i > 0) {
      const gap = word.start - words[i - 1].end;
      if (gap >= HESITATION_PAUSE_THRESHOLD) {
        enriched += ` [pause ${gap.toFixed(1)}s]`;
      }
    }

    // Mark filler words inline
    const wordLower = wordText.toLowerCase();
    if (FILLER_WORDS.includes(wordLower)) {
      enriched += ` [${wordLower}]`; // e.g. [um], [uh]
    } else {
      enriched += ` ${wordText}`;
    }
  }

  return enriched.trim();
}

// ─────────────────────────────────────────────────────────────
// STEP 5 — Plain-English summary
// Injected into GPT-4o context so it can reference voice quality naturally
// e.g. "speaks at an ideal pace. 2 filler words — acceptable."
// ─────────────────────────────────────────────────────────────
function generateSummary(wpm, fillerCount, thinkingPauses, hesitationPauses) {
  const parts = [];

  // WPM assessment
  if (wpm === 0)                    parts.push("speech rate unavailable");
  else if (wpm >= 110 && wpm <= 150) parts.push(`speaks at an ideal pace (${wpm} wpm)`);
  else if (wpm < 90)                 parts.push(`speaks slowly (${wpm} wpm) — may be struggling to articulate`);
  else if (wpm > 160)                parts.push(`speaks quickly (${wpm} wpm) — may be rushing`);
  else                               parts.push(`pace is acceptable (${wpm} wpm)`);

  // Filler word assessment
  if (fillerCount === 0)       parts.push("no filler words");
  else if (fillerCount <= 3)   parts.push(`${fillerCount} filler words — acceptable`);
  else if (fillerCount <= 6)   parts.push(`${fillerCount} filler words — noticeable`);
  else                         parts.push(`${fillerCount} filler words — excessive`);

  // Pause pattern assessment
  if (thinkingPauses > 0 && hesitationPauses === 0) {
    parts.push("pauses suggest thoughtful engagement");
  } else if (hesitationPauses > thinkingPauses * 2) {
    parts.push("frequent mid-sentence hesitations suggest low confidence");
  } else if (thinkingPauses > hesitationPauses) {
    parts.push("mostly confident with some hesitation");
  } else {
    parts.push("mixed pause pattern — moderate confidence");
  }

  return parts.join(". ") + ".";
}

// ─────────────────────────────────────────────────────────────
// GUARDRAIL: Fallback for empty/failed transcripts
// Returns a safe default voiceSignal so the interview can continue
// even if Whisper returns nothing
// ─────────────────────────────────────────────────────────────
function buildEmptySignal(transcript) {
  return {
    wpm:                 0,
    filler_count:        countFillerWords(transcript),
    thinking_pauses:     0,
    hesitation_pauses:   0,
    enriched_transcript: transcript || "",
    summary:             "Voice signal extraction failed — answer may be too short or audio unclear.",
  };
}