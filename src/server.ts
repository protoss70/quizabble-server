import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { PassThrough } from "stream";
import { connectDB } from "./services/database";
import { streamToS3 } from "./services/storage";
import cors from "cors";
import { createHash } from "crypto";
import { rearrangementQuestionEngToTarget, rearrangementQuestionTargetToEng, wordMultipleChoiceQuestion } from "./services/chatgpt/chatgptService";

function computeSHA256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

dotenv.config();
const app = express();
app.use(express.json());

// Set up CORS policies
const allowedOrigins = ["http://localhost:5173", "https://quizabble.web.app"];
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  }),
);

// Connect to the database
connectDB();
app.get("/", (req: Request, res: Response) => {
  res.send("Server running");
});

app.post("/generate-word-multiple-choice", async (req: Request, res: Response) => {
  try {
    const { keywords, amount, targetLanguage } = req.body;

    // Validate input
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      res.status(400).json({ error: "Keywords must be a non-empty array." });
      return;
    }
    if (!amount || typeof amount !== "number" || amount < 2) {
      res.status(400).json({ error: "Amount must be a number greater than 1." });
      return;
    }
    if (!targetLanguage || typeof targetLanguage !== "string") {
      res.status(400).json({ error: "TargetLanguage must be a valid string." });
      return;
    }

    // Call the OpenAI function
    const result = await wordMultipleChoiceQuestion(keywords, amount, targetLanguage);

    // Send successful response
    res.status(200).json(result);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/generate-rearrangement-question-eng-to-target", async (req: Request, res: Response) => {
  try {
    const { criticalQuestions, studentLevel, amount, targetLanguage } = req.body;

    // Validate input
    if (!criticalQuestions || !Array.isArray(criticalQuestions) || criticalQuestions.length === 0) {
      res.status(400).json({ error: "CriticalQuestions must be a non-empty array." });
      return;
    }
    if (!studentLevel || !["A1", "A2", "B1", "B2"].includes(studentLevel)) {
      res.status(400).json({ error: "StudentLevel must be one of 'A1', 'A2', 'B1', 'B2'." });
      return;
    }
    if (!amount || typeof amount !== "number" || amount < 1) {
      res.status(400).json({ error: "Amount must be a number greater than 0." });
      return;
    }
    if (!targetLanguage || typeof targetLanguage !== "string") {
      res.status(400).json({ error: "TargetLanguage must be a valid string." });
      return;
    }

    // Call the function
    const result = await rearrangementQuestionEngToTarget(criticalQuestions, studentLevel, amount, targetLanguage);

    // Send successful response
    res.status(200).json(result);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/generate-rearrangement-question-target-to-eng", async (req: Request, res: Response) => {
  try {
    const { criticalQuestions, studentLevel, amount, targetLanguage } = req.body;

    // Validate input
    if (!criticalQuestions || !Array.isArray(criticalQuestions) || criticalQuestions.length === 0) {
      res.status(400).json({ error: "CriticalQuestions must be a non-empty array." });
      return;
    }
    if (!studentLevel || !["A1", "A2", "B1", "B2"].includes(studentLevel)) {
      res.status(400).json({ error: "StudentLevel must be one of 'A1', 'A2', 'B1', 'B2'." });
      return;
    }
    if (!amount || typeof amount !== "number" || amount < 1) {
      res.status(400).json({ error: "Amount must be a number greater than 0." });
      return;
    }
    if (!targetLanguage || typeof targetLanguage !== "string") {
      res.status(400).json({ error: "TargetLanguage must be a valid string." });
      return;
    }

    // Call the function
    const result = await rearrangementQuestionTargetToEng(criticalQuestions, studentLevel, amount, targetLanguage);

    // Send successful response
    res.status(200).json(result);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Use HTTP server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// Track file streams and chunk indexes
const activeStreams = new Map<
  string,
  { passThrough: PassThrough; lastChunkIndex: number }
>();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on(
    "start-audio",
    async (data: { contentType?: string; fileKey?: string }) => {
      const contentType = data?.contentType || "audio/webm";
      const fileKey = data?.fileKey;

      if (!fileKey) {
        console.error(
          `❌ No fileKey received for socket: ${socket.id}. Ignoring request.`,
        );
        return;
      }

      let passThrough;
      let lastChunkIndex = -1;

      if (activeStreams.has(fileKey)) {
        console.log(`🔄 Resuming stream for ${fileKey}`);
        passThrough = activeStreams.get(fileKey)!.passThrough;
        lastChunkIndex = activeStreams.get(fileKey)!.lastChunkIndex;
      } else {
        console.log(`🎤 Creating new stream for ${fileKey}`);
        passThrough = new PassThrough();
        activeStreams.set(fileKey, { passThrough, lastChunkIndex });

        streamToS3(passThrough, contentType, fileKey)
          .then((uploadedUrl) => {
            if (uploadedUrl) {
              console.log(
                `✅ Upload successful for ${fileKey}: ${uploadedUrl}`,
              );
              activeStreams.delete(fileKey); // Clean up after successful upload
            } else {
              console.error(`❌ Upload failed for ${fileKey}`);
            }
          })
          .catch((err) => {
            console.error("❌ Error uploading audio stream:", err);
          });
      }

      socket.data = { passThrough, fileKey, lastChunkIndex, inSync: true };

      console.log(
        `🎙️ Streaming setup for ${socket.id} with fileKey ${fileKey}, last received chunk: ${lastChunkIndex}`,
      );
    },
  );

  socket.on(
    "audio-chunk",
    (data: { buffer: number[]; hash: string; chunkIndex: number }) => {
      const socketData = socket.data;
      if (!socketData || !socketData.passThrough) {
        console.error(
          `⚠️ Received chunk but no active stream for socket: ${socket.id}`,
        );
        return;
      }

      const { passThrough, fileKey } = socketData;

      // Fetch stored last chunk index for this file
      let lastChunkIndex = activeStreams.get(fileKey)?.lastChunkIndex ?? -1;

      if (data.chunkIndex !== lastChunkIndex + 1) {
        console.warn(
          `⚠️ Out-of-order chunk: Expected ${lastChunkIndex + 1}, but received ${data.chunkIndex}. Ignoring.`,
        );
        if (socket.data.inSync) {
          console.log("Sent chunk index", lastChunkIndex);
          socket.emit("chunk-index", { lastChunkIndex: lastChunkIndex });
          socket.data.inSync = false;
        }

        return;
      }

      try {
        const buffer = Buffer.from(data.buffer);

        const computedHash = computeSHA256(buffer);
        if (computedHash !== data.hash) {
          console.error(
            `❌ Chunk hash mismatch! Ignoring chunk ${data.chunkIndex} from socket: ${socket.id}`,
          );
          return;
        }

        passThrough.write(buffer);
        activeStreams.get(fileKey)!.lastChunkIndex = data.chunkIndex; // Update chunk index
        if (data.chunkIndex % 100 === 0) {
          socket.emit("clear-chunks", { checkpoint: data.chunkIndex });
          console.log(
            `📝 Received and stored chunk ${data.chunkIndex} for ${fileKey}`,
          );
        }
        socket.data.inSync = true;
      } catch (error) {
        console.error(
          `❌ Error processing audio chunk for socket: ${socket.id}`,
          error,
        );
      }
    },
  );

  socket.on("finish-recording", () => {
    console.log(`📌 Finish recording requested for socket: ${socket.id}`);

    if (socket.data && socket.data.passThrough) {
      const { fileKey, passThrough } = socket.data;

      console.log(`⏹️ Manually finalizing upload for ${fileKey}`);

      // End the stream and remove from active streams
      passThrough.end();
      activeStreams.delete(fileKey);

      // Set flag to prevent double upload on disconnect
      socket.data.isFinished = true;

      // Notify the client
      socket.emit("recording-finished", { fileKey });

      // Optionally disconnect the socket
      socket.disconnect();
    } else {
      console.warn(`⚠️ No active recording found for socket: ${socket.id}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);

    // Check if the recording was manually finished to prevent duplicate upload
    if (socket.data?.isFinished) {
      console.log(
        `🚫 Skipping disconnect handling for ${socket.id} (already finished)`,
      );
      return; // Exit early, preventing unnecessary upload
    }

    if (socket.data && socket.data.passThrough) {
      const { fileKey, passThrough } = socket.data;
      console.log(
        `🛑 Connection lost, keeping stream active for fileKey: ${fileKey}`,
      );

      let elapsedSeconds = 0;
      let checkInterval = 2000; // Start with 2-second intervals

      const interval = setInterval(() => {
        if (elapsedSeconds >= 600) {
          // Stop after 10 minutes (600s)
          clearInterval(interval);
        }

        const isFileKeyInUse = [...io.sockets.sockets.values()].some(
          (s) => s.data?.fileKey === fileKey,
        );

        if (isFileKeyInUse) { 
          console.log(
            `🔄 Reconnection detected, keeping stream active for ${fileKey}`,
          );
          clearInterval(interval); // Stop checking
        } else if (elapsedSeconds >= 600) {
          // If user doesn't reconnect within 10 minutes
          console.log(
            `⏹️ No reconnection detected, finalizing upload for ${fileKey}`,
          );
          passThrough.end();
          activeStreams.delete(fileKey);
          clearInterval(interval);
        }

        elapsedSeconds += checkInterval / 1000; // Convert ms to seconds

        // After 1 minute, start exponential backoff
        if (elapsedSeconds >= 60) {
          checkInterval = Math.min(checkInterval * 2, 30000); // Max interval of 30s
        }

        setTimeout(() => interval, checkInterval); // Dynamically adjust interval timing
      }, checkInterval);
    }
  });
});

// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
