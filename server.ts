import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Server-side Text-To-Speech endpoint using Google Translate TTS
  // Eliminates client-side CORS, 401s, mixed content, and mobile WebView SpeechSynthesis limitations
  app.get("/api/tts", async (req, res) => {
    try {
      const text = (req.query.text as string) || "";
      const lang = (req.query.lang as string) || "en";

      if (!text || text.trim().length === 0) {
        res.status(400).json({ error: "Text parameter is required" });
        return;
      }

      // Split text into natural sentence chunks under 140 chars for Google Translate TTS
      const rawSentences = text.match(/[^.!?;\n]+[.!?;\n]*/g) || [text];
      const chunks: string[] = [];

      for (const sentence of rawSentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;

        if (trimmed.length <= 140) {
          chunks.push(trimmed);
        } else {
          // Split longer sentences by commas or colons
          const parts = trimmed.split(/([,:]\s*)/);
          let current = "";
          for (const part of parts) {
            if ((current + part).length <= 140) {
              current += part;
            } else {
              if (current.trim()) chunks.push(current.trim());
              current = part;
            }
          }
          if (current.trim()) {
            chunks.push(current.trim());
          }
        }
      }

      const finalChunks = chunks.length > 0 ? chunks : [text.slice(0, 140)];

      // Fetch MP3 audio buffers for each chunk in parallel/sequence
      const audioBuffers: Buffer[] = [];
      const userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

      for (const chunk of finalChunks) {
        const encoded = encodeURIComponent(chunk);
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${encodeURIComponent(
          lang
        )}&client=tw-ob`;

        try {
          const ttsRes = await fetch(ttsUrl, {
            headers: {
              "User-Agent": userAgent,
              Referer: "https://translate.google.com/",
            },
          });

          if (ttsRes.ok) {
            const arrayBuf = await ttsRes.arrayBuffer();
            audioBuffers.push(Buffer.from(arrayBuf));
          } else {
            console.warn(`TTS fetch failed for chunk with status ${ttsRes.status}`);
          }
        } catch (err) {
          console.warn("Error fetching TTS chunk:", err);
        }
      }

      if (audioBuffers.length === 0) {
        res.status(502).json({ error: "Failed to generate speech audio" });
        return;
      }

      const combinedBuffer = Buffer.concat(audioBuffers);

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", combinedBuffer.length.toString());
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Accept-Ranges", "bytes");

      res.status(200).send(combinedBuffer);
    } catch (err) {
      console.error("TTS endpoint error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
