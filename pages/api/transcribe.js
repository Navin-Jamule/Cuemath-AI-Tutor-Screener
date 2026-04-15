// /pages/api/transcribe.js
// audio blob → Whisper verbose_json → voiceSignal
// FIX: use fs.createReadStream (not File object) — most reliable for Whisper

import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import os from "os";
import { extractVoiceSignals } from "../../Agents/voiceSignalExtractor";

export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function emptySignal(reason) {
  return {
    wpm: 0,
    filler_count: 0,
    thinking_pauses: 0,
    hesitation_pauses: 0,
    enriched_transcript: "",
    summary: reason,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parse multipart form
  const form = formidable({
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024,
    uploadDir: os.tmpdir(),
    allowEmptyFiles: true,
    minFileSize: 0,
  });

  let files;
  try {
    [, files] = await form.parse(req);
  } catch (err) {
    console.error("[transcribe] formidable error:", err);
    return res.status(200).json({ text: "", voiceSignal: emptySignal("Upload parse error") });
  }

  const audioFile = files.audio?.[0];
  if (!audioFile) {
    return res.status(200).json({ text: "", voiceSignal: emptySignal("No audio file received") });
  }

  const tempPath = audioFile.filepath;

  // Guard: skip if file too small (empty recording)
  let fileSize = 0;
  try { fileSize = fs.statSync(tempPath).size; } catch (_) {}

  if (fileSize < 1000) {
    console.log("[transcribe] Audio too small:", fileSize, "bytes — skipping Whisper");
    try { fs.unlinkSync(tempPath); } catch (_) {}
    return res.status(200).json({ text: "", voiceSignal: emptySignal("Audio too short") });
  }

  // Copy to a properly named .webm file
  // Whisper REQUIRES the file extension to detect format
  const namedPath = path.join(os.tmpdir(), `whisper_${Date.now()}.webm`);

  try {
    fs.copyFileSync(tempPath, namedPath);
  } catch (err) {
    console.error("[transcribe] File copy error:", err);
    try { fs.unlinkSync(tempPath); } catch (_) {}
    return res.status(200).json({ text: "", voiceSignal: emptySignal("File copy error") });
  }

  // Always clean up original temp file
  try { fs.unlinkSync(tempPath); } catch (_) {}

  try {
    console.log("[transcribe] Sending to Whisper, size:", fileSize, "bytes");

    // KEY FIX: use fs.createReadStream — works reliably with OpenAI Node SDK
    // File() object approach was causing format detection failures
    const whisperResponse = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: fs.createReadStream(namedPath),
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    console.log("[transcribe] Whisper success:", whisperResponse.text?.slice(0, 80));

    // Extract voice signals from word timestamps
    let voiceSignal;
    try {
      // Pass duration from Whisper response for accurate WPM
      const duration = whisperResponse.duration || 0;
      voiceSignal = extractVoiceSignals(whisperResponse, duration);
    } catch (vsErr) {
      console.error("[transcribe] voiceSignal error:", vsErr.message);
      voiceSignal = emptySignal("Voice signal extraction failed");
    }

    return res.status(200).json({
      text: whisperResponse.text || "",
      voiceSignal,
    });

  } catch (err) {
    console.error("[transcribe] Whisper error:", err.message);
    return res.status(200).json({
      text: "",
      voiceSignal: emptySignal("Whisper transcription failed"),
    });
  } finally {
    // Always clean up named temp file
    try { fs.unlinkSync(namedPath); } catch (_) {}
  }
}