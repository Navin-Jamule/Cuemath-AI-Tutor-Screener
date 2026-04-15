// ─────────────────────────────────────────────────────────────
// /Agents/verdictCalculator.js
// Pure math functions for final score calculation
// No API calls — fully unit-testable offline
//
// WHY THIS EXISTS:
// GPT-4o sometimes makes arithmetic errors.
// We always re-verify the final score with our own math.
// The LLM scores the dimensions — we do the weighted sum.
// ─────────────────────────────────────────────────────────────

// ── WEIGHTS (must sum to 1.0) ─────────────────────────────────
const DIMENSION_WEIGHTS = {
  explanation_quality: 0.30, // LLM scored
  clarity_simplicity:  0.25, // LLM scored
  engagement:          0.20, // LLM scored (uses voiceSignal as context)
  fluency:             0.15, // Rule scored (wpm + fillers)
  confidence:          0.10, // Rule scored (pause classifier)
};

// ── VERDICT THRESHOLDS ────────────────────────────────────────
const THRESHOLDS = {
  pass:   7.5,
  hold:   5.5,
  // below 5.5 = Reject
};

// ── SCORE BOUNDS ─────────────────────────────────────────────
const MIN_SCORE = 1;
const MAX_SCORE = 10;

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT: Calculate and verify final score
//
// @param {Object} scores - scores object from GPT-4o judge response
//   shape: { explanation_quality: {score}, clarity_simplicity: {score}, ... }
// @returns {Object} { contentScore, voiceScore, finalScore, verdict }
// ─────────────────────────────────────────────────────────────
export function calculateFinalScore(scores) {
  // ── GUARDRAIL: validate all scores exist and are in range ──
  const validatedScores = validateAndClampScores(scores);

  // ── Content score (LLM dimensions) ────────────────────────
  // Max possible = (10×0.30) + (10×0.25) + (10×0.20) = 7.5
  const contentScore =
    (validatedScores.explanation_quality * DIMENSION_WEIGHTS.explanation_quality) +
    (validatedScores.clarity_simplicity  * DIMENSION_WEIGHTS.clarity_simplicity)  +
    (validatedScores.engagement          * DIMENSION_WEIGHTS.engagement);

  // ── Voice score (rule-based dimensions) ───────────────────
  // Max possible = (10×0.15) + (10×0.10) = 2.5
  const voiceScore =
    (validatedScores.fluency    * DIMENSION_WEIGHTS.fluency)    +
    (validatedScores.confidence * DIMENSION_WEIGHTS.confidence);

  // ── Final score ────────────────────────────────────────────
  // contentScore + voiceScore → max = 7.5 + 2.5 = 10.0
  const finalScore = contentScore + voiceScore;

  return {
    contentScore: round2(contentScore),
    voiceScore:   round2(voiceScore),
    finalScore:   round2(finalScore),
    verdict:      getVerdict(finalScore),
  };
}

// ─────────────────────────────────────────────────────────────
// VERDICT from final score
// @param {number} finalScore
// @returns {string} "Pass" | "Hold" | "Reject"
// ─────────────────────────────────────────────────────────────
export function getVerdict(finalScore) {
  if (finalScore >= THRESHOLDS.pass) return "Pass";
  if (finalScore >= THRESHOLDS.hold) return "Hold";
  return "Reject";
}

// ─────────────────────────────────────────────────────────────
// RULE-BASED FLUENCY SCORE
// Computed from voiceSignal — used as sanity check vs LLM's score
// Also called directly in /api/assess.js before judge call
//
// @param {Object} voiceSignal - { wpm, filler_count }
// @returns {number} fluency score 1-10
// ─────────────────────────────────────────────────────────────
export function calculateFluencyScore(voiceSignal) {
  const { wpm = 0, filler_count = 0 } = voiceSignal;

  let score;

  // WPM bands
  if (wpm >= 110 && wpm <= 150)      score = 9;  // ideal teaching pace
  else if (wpm >= 90  && wpm < 110)  score = 7;  // slightly slow but acceptable
  else if (wpm > 150  && wpm <= 170) score = 7;  // slightly fast but acceptable
  else if (wpm > 0)                  score = 4;  // too slow or too fast
  else                               score = 5;  // wpm unknown — neutral

  // Filler word penalty: -1 per 3 fillers
  const fillerPenalty = Math.floor(filler_count / 3);
  score -= fillerPenalty;

  return clamp(score, MIN_SCORE, MAX_SCORE);
}

// ─────────────────────────────────────────────────────────────
// RULE-BASED CONFIDENCE SCORE
// Computed from pause classifier output
// Thinking pauses = GOOD (candidate reflects before answering)
// Hesitation pauses = BAD (candidate loses thread mid-sentence)
//
// @param {Object} voiceSignal - { thinking_pauses, hesitation_pauses }
// @returns {number} confidence score 1-10
// ─────────────────────────────────────────────────────────────
export function calculateConfidenceScore(voiceSignal) {
  const {
    thinking_pauses   = 0,
    hesitation_pauses = 0,
  } = voiceSignal;

  let score = 8; // base — assume moderate confidence

  // Thinking pauses add confidence (max bonus +2)
  score += Math.min(thinking_pauses * 0.5, 2);

  // Hesitation pauses reduce confidence
  score -= hesitation_pauses * 0.5;

  return clamp(round1(score), MIN_SCORE, MAX_SCORE);
}

// ─────────────────────────────────────────────────────────────
// GUARDRAIL: Validate and clamp all dimension scores
// Prevents LLM returning out-of-range values (e.g. 11, -1, null)
// ─────────────────────────────────────────────────────────────
function validateAndClampScores(scores) {
  const dimensions = Object.keys(DIMENSION_WEIGHTS);
  const validated  = {};

  for (const dim of dimensions) {
    const raw = scores?.[dim]?.score ?? scores?.[dim];

    // If score is missing or not a number → default to 5 (neutral)
    const num = typeof raw === "number" && !isNaN(raw) ? raw : 5;
    validated[dim] = clamp(num, MIN_SCORE, MAX_SCORE);
  }

  return validated;
}

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────

// Clamp a value between min and max
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Round to 2 decimal places
function round2(value) {
  return parseFloat(value.toFixed(2));
}

// Round to 1 decimal place
function round1(value) {
  return parseFloat(value.toFixed(1));
}