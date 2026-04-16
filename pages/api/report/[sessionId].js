// /pages/api/report/[sessionId].js
// Serves the stored report JSON for the recruiter page
// Protected by RECRUITER_SECRET query param

import fs from "fs";
import path from "path";
import os from "os";

export default function handler(req, res) {
  const { sessionId, secret } = req.query;

  // Auth check
  if (secret !== process.env.RECRUITER_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId required" });
  }

  const reportPath = path.join(os.tmpdir(), `report_${sessionId}.json`);

  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({ error: "Report not found" });
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
    res.setHeader("Cache-Control", "no-store");           // ← ADDED: fixes 304
    return res.status(200).json(report);
  } catch (err) {
    console.error("[report] Read error:", err.message);
    return res.status(500).json({ error: "Failed to read report" });
  }
}
