// /pages/api/respond.js
// transcript + voiceSignal + session → GPT-4o (CONVERSATION_SYSTEM_PROMPT) → aiDecision

import OpenAI from "openai";
import { CONVERSATION_SYSTEM_PROMPT } from "../../Agents/prompts";
import { QUESTION_BANK } from "../../Agents/questionBank";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { session, transcript, voiceSignal } = req.body;

  if (!session) {
    return res.status(400).json({ error: "session is required" });
  }
  // transcript can be empty string (Whisper graceful degradation) — that's OK

  // Build the user message for GPT: include current question context + turn history
  const currentTurn = session.turns[session.currentTurnIndex] || {};
  const questionAsked = currentTurn.questionAsked || "";
  const isFollowUp = currentTurn.isFollowUp || false;

  // Serialize full turn history for memory
  const turnHistory = session.turns
    .slice(0, session.currentTurnIndex)
    .map((t, i) => {
      const lines = [
        `Turn ${i + 1}${t.isFollowUp ? " (follow-up)" : ""}:`,
        `  Q: ${t.questionAsked}`,
        `  A: ${t.transcript}`,
        `  Voice: ${JSON.stringify(t.voiceSignal)}`,
        `  Eval: ${t.aiEvaluation || "pending"}`,
      ];
      if (t.followUpAsked) lines.push(`  Follow-up asked: ${t.followUpAsked}`);
      return lines.join("\n");
    })
    .join("\n\n");

  // Determine next question options for GPT context
  const nextQuestionIndex = session.questionsAsked; // 0-based
  const nextMainQuestion =
    nextQuestionIndex < QUESTION_BANK.length
      ? QUESTION_BANK[nextQuestionIndex].mainQuestion
      : null;

  // Determine follow-up for current question
  const currentQuestionBankIndex = isFollowUp
    ? session.questionsAsked - 1
    : session.questionsAsked;
  const followUpForCurrent =
    currentQuestionBankIndex >= 0 && currentQuestionBankIndex < QUESTION_BANK.length
      ? QUESTION_BANK[currentQuestionBankIndex].followUp
      : null;

  const userMessage = `
CANDIDATE: ${session.candidateName} | SUBJECT: ${session.subject}
QUESTIONS ASKED: ${session.questionsAsked} / 4
FOLLOW-UPS USED THIS QUESTION: ${isFollowUp ? 1 : 0} / 1
TOTAL TURNS: ${session.currentTurnIndex + 1} / 7

--- CONVERSATION HISTORY ---
${turnHistory || "(This is the first turn)"}

--- CURRENT TURN ---
Question asked: "${questionAsked}"
Is follow-up: ${isFollowUp}
Candidate transcript: "${transcript}"
Voice signal: ${JSON.stringify(voiceSignal)}

--- NEXT QUESTION AVAILABLE ---
Next main question: ${nextMainQuestion ? `"${nextMainQuestion}"` : "None — all 4 questions done"}
Follow-up for current question: ${followUpForCurrent ? `"${followUpForCurrent}"` : "Already used or unavailable"}

--- RULES FOR YOUR RESPONSE ---
- If this was a follow-up OR the answer is strong: nextAction = "next_question", nextQuestion = next main question (or "end_interview" if none left)
- If answer is weak AND no follow-up used yet: nextAction = "follow_up", nextQuestion = the follow-up question above
- If questionsAsked >= 4 OR turns >= 7: nextAction = "end_interview", nextQuestion = null
- Never probe more than once per main question
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CONVERSATION_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 400,
      temperature: 0.4,
    });

    let aiDecision;
    try {
      aiDecision = JSON.parse(completion.choices[0].message.content);
    } catch (parseErr) {
      console.error("[respond] JSON parse error:", parseErr);
      return res.status(500).json({ error: "AI response was not valid JSON" });
    }

    // Validate required fields
    const { aiEvaluation, aiResponse, nextAction, nextQuestion } = aiDecision;
    if (!aiEvaluation || !aiResponse || !nextAction) {
      return res.status(500).json({ error: "AI response missing required fields" });
    }

    // Safety guard: enforce turn limits server-side regardless of LLM decision
    const totalTurns = session.currentTurnIndex + 1;
    const safeNextAction =
      totalTurns >= 7 || session.questionsAsked >= 4 ? "end_interview" : nextAction;

    return res.status(200).json({
      aiEvaluation,
      aiResponse,
      nextAction: safeNextAction,
      nextQuestion: safeNextAction === "end_interview" ? null : nextQuestion,
    });
  } catch (err) {
    console.error("[respond] GPT-4o error:", err);
    return res.status(500).json({ error: "AI response failed" });
  }
}