// ─────────────────────────────────────────────────────────────
// /Agents/questionBank.js
// All interview questions, follow-ups, and evaluation signals
// Used by: /pages/api/respond.js, /pages/interview.js
//
// STRUCTURE per question:
//   id          — unique identifier
//   competency  — what skill this tests
//   mainQuestion — what the AI asks
//   followUp    — asked only if answer is "weak" (max once per question)
//   weakSignals — patterns that indicate a weak answer (for LLM context)
//   strongSignals — patterns that indicate a strong answer (for LLM context)
// ─────────────────────────────────────────────────────────────

export const QUESTION_BANK = [
  {
    id: "q1",
    competency: "simplification",
    mainQuestion:
      "Can you explain what a fraction is to a 9-year-old who has never heard the word before?",
    followUp:
      "That's a start — can you add a real-life example a child would immediately recognise?",
    weakSignals: [
      "uses terms like numerator or denominator without explaining them",
      "no concrete everyday example given",
      "answer is under 2 sentences",
      "explanation would confuse a 9-year-old",
    ],
    strongSignals: [
      "uses everyday analogy — pizza, chocolate, apple slices",
      "checks if the imaginary student understood",
      "uses child-appropriate language throughout",
      "breaks the concept into small steps",
    ],
  },

  {
    id: "q2",
    competency: "patience",
    mainQuestion:
      "A student has been staring at the same problem for 5 minutes and says 'I just don't get it'. What do you do?",
    followUp:
      "What specific words would you actually say to that student in that moment?",
    weakSignals: [
      "says 'explain again' with no change in approach",
      "shows frustration or impatience",
      "no mention of acknowledging the student's feelings",
      "generic answer with no concrete action",
      "suggests the student try harder without support",
    ],
    strongSignals: [
      "acknowledges the student's frustration before re-explaining",
      "breaks the problem into smaller, simpler steps",
      "tries a completely different explanation method",
      "uses encouraging and empathetic language",
      "checks what specific part the student is stuck on",
    ],
  },

  {
    id: "q3",
    competency: "engagement",
    mainQuestion:
      "How would you keep a 10-year-old engaged during an online math session when you can see they are getting distracted?",
    followUp:
      "Can you give me one specific activity or technique you would use right at that moment?",
    weakSignals: [
      "vague answer like 'make it fun' with no specifics",
      "no specific technique mentioned",
      "only mentions warnings or consequences",
      "does not acknowledge why children get distracted online",
    ],
    strongSignals: [
      "mentions a specific interactive activity or game",
      "adapts the content to something the child is interested in",
      "uses storytelling or gamification",
      "acknowledges online attention challenges explicitly",
      "involves the student actively instead of passive listening",
    ],
  },

  {
    id: "q4",
    competency: "communication",
    mainQuestion:
      "Can you walk me through how you would introduce multiplication to a student who only knows addition?",
    followUp:
      "How would you check that the student has actually understood and not just memorised the steps?",
    weakSignals: [
      "jumps straight to times tables without building up",
      "no connection made between multiplication and addition",
      "uses terms like 'product' without explaining",
      "no check for understanding mentioned",
    ],
    strongSignals: [
      "connects multiplication to repeated addition explicitly",
      "uses a visual or physical example (rows of objects, groups)",
      "builds the concept step by step before introducing symbols",
      "explicitly checks for understanding, not just memorisation",
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Get the next MAIN question to ask based on session state
// Returns null when all 4 questions have been asked
//
// @param {Object} session - current session object
// @returns {Object|null} question object or null
// ─────────────────────────────────────────────────────────────
export function getNextQuestion(session) {
  // Count how many main (non-follow-up) questions have been asked
  const mainQuestionsAsked = session.turns.filter(t => !t.isFollowUp).length;

  // Return next question or null if all done
  return QUESTION_BANK[mainQuestionsAsked] || null;
}

// ─────────────────────────────────────────────────────────────
// Get follow-up question if conditions are met
// Conditions: answer was weak AND follow-up not yet used for this question
//
// @param {Object} session - current session object
// @param {Object} currentQuestion - the question object currently being answered
// @returns {string|null} follow-up question text or null
// ─────────────────────────────────────────────────────────────
export function getFollowUp(session, currentQuestion) {
  if (!currentQuestion) return null;

  const lastTurn = session.turns[session.turns.length - 1];
  if (!lastTurn) return null;

  // Check if a follow-up was already asked for this question
  const followUpAlreadyUsed = session.turns.some(
    t => t.isFollowUp && t.questionAsked === currentQuestion.followUp
  );

  // Only give follow-up if: answer was weak AND follow-up not yet used
  if (lastTurn.aiEvaluation === "weak" && !followUpAlreadyUsed) {
    return currentQuestion.followUp;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Check if the interview should end
// Ends when: 4 main questions done OR 7 total turns reached
//
// @param {Object} session - current session object
// @returns {boolean}
// ─────────────────────────────────────────────────────────────
export function shouldEndInterview(session) {
  const mainQuestionsAsked = session.turns.filter(t => !t.isFollowUp).length;
  const totalTurns         = session.turns.length;

  const allQuestionsDone = mainQuestionsAsked >= QUESTION_BANK.length;
  const maxTurnsReached  = totalTurns >= 7; // safety cap

  return allQuestionsDone || maxTurnsReached;
}