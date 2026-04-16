// /pages/api/assess.js
// Full session → GPT-4o-mini judge → verified score → store report server-side
// FIX: stores report in /tmp/report_{sessionId}.json
// Recruiter fetches it via /api/report/[sessionId] — works across tabs

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";
import { JUDGE_SYSTEM_PROMPT, buildJudgeUserMessage, MODEL_CONFIG } from "../../Agents/prompts";
import { calculateFinalScore } from "../../Agents/verdictCalculator";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { session } = req.body;
  if (!session) return res.status(400).json({ error: "No session provided" });

  try {
    const userMessage = buildJudgeUserMessage(session);

    const response = await openai.chat.completions.create({
      model: MODEL_CONFIG.judge,
      messages: [
        { role: "system", content: JUDGE_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const judgeOutput = JSON.parse(response.choices[0].message.content);
    const verified = calculateFinalScore(judgeOutput.scores);

    const report = {
      ...judgeOutput,
      content_score: verified.contentScore,
      voice_score: verified.voiceScore,
      final_score: verified.finalScore,
      verdict: verified.verdict,
      sessionId: session.sessionId,
      candidateName: session.candidateName,
      subject: session.subject,
      completedAt: new Date().toISOString(),
    };

    const reportPath = path.join(os.tmpdir(), `report_${session.sessionId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log("[assess] Report saved:", reportPath, "| Verdict:", report.verdict);

    return res.status(200).json({ ok: true, verdict: report.verdict, sessionId: session.sessionId });

  } catch (err) {
    console.error("[assess] Error:", err.message);
    return res.status(500).json({ error: "Assessment failed", detail: err.message });
  }
}