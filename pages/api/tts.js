// /pages/api/tts.js
// text → TTS-1 (nova, 0.95 speed) → mp3 stream
// Supports both POST (body) and GET (?text=...) for direct <Audio src> streaming

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // Support GET so browser Audio element can use it as src directly
  const text =
    req.method === "GET"
      ? req.query.text
      : req.body?.text;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "text is required" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model:           "tts-1",
      voice:           "nova",
      input:           text.trim(),
      speed:           0.95,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    res.setHeader("Content-Type",   "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control",  "no-store");
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("[tts] OpenAI error:", err);
    return res.status(500).json({ error: "TTS generation failed" });
  }
}