import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { PassThrough } from "stream";
import { connectDB } from "./services/database";
import { streamToS3 } from "./services/storage";
import cors from "cors";

import { createHash } from "crypto";

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

// Use HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on(
    "start-audio",
    async (data: { contentType?: string; fileKey?: string }) => {
      const contentType = data?.contentType || "audio/webm";
      const fileKey = data?.fileKey; // Get fileKey from frontend

      if (!fileKey) {
        console.error(
          `❌ No fileKey received for socket: ${socket.id}. Ignoring request.`,
        );
        return;
      }

      const passThrough = new PassThrough();

      // Start streaming to S3 immediately
      streamToS3(passThrough, contentType, fileKey)
        .then((uploadedUrl) => {
          if (uploadedUrl) {
            socket.emit("upload-success", { url: uploadedUrl });
            console.log(`✅ Upload successful for ${fileKey}: ${uploadedUrl}`);
          } else {
            socket.emit("upload-error", { error: "Failed to upload audio" });
          }
        })
        .catch((err) => {
          console.error("❌ Error uploading audio stream:", err);
          socket.emit("upload-error", { error: "Failed to upload audio" });
        });

      // Store fileKey and stream in socket data
      socket.data = {
        passThrough,
        fileKey,
        contentType,
        isPaused: false, // Track pause state
      };

      console.log(
        `🎤 Started streaming for socket ${socket.id} with fileKey ${fileKey}`,
      );
    },
  );

  socket.on("audio-chunk", async (data: { buffer: any; hash: string }) => {
    console.log("🔍 Received chunk data structure:", typeof data.buffer, data.buffer);
  
    const socketData = socket.data;
    if (!socketData || !socketData.passThrough || socketData.isPaused) {
      console.error(`⚠️ Received chunk but no active stream for socket: ${socket.id}`);
      return;
    }
  
    try {
      let buffer: Buffer;
  
      // Check if data.buffer is already a Buffer
      if (Buffer.isBuffer(data.buffer)) {
        buffer = data.buffer;
      }
      // Check if it's an ArrayBuffer and convert it
      else if (data.buffer instanceof ArrayBuffer) {
        buffer = Buffer.from(new Uint8Array(data.buffer));
      }
      // Check if it's an object with a `.data` array (e.g., JSON-serialized Buffer)
      else if (typeof data.buffer === "object" && Array.isArray(data.buffer.data)) {
        console.warn("⚠️ Received object with .data array. Converting.");
        buffer = Buffer.from(data.buffer.data);
      }
      // Handle unknown format
      else {
        console.error("❌ Unknown buffer format received:", data.buffer);
        return;
      }
  
      // Compute hash and validate
      const computedHash = computeSHA256(buffer);
      if (computedHash !== data.hash) {
        console.error(`❌ Chunk hash mismatch! Possible corruption. Ignoring chunk from socket: ${socket.id}`);
        return;
      }
  
      // Write verified chunk to stream
      socketData.passThrough.write(buffer);
  
    } catch (error) {
      console.error(`❌ Error processing audio chunk for socket: ${socket.id}`, error);
    }
  });
  

  socket.on("pause-audio", () => {
    if (socket.data) {
      socket.data.isPaused = true;
      console.log(`⏸️ Audio stream paused for socket: ${socket.id}`);
    }
  });

  socket.on("resume-audio", () => {
    if (socket.data) {
      socket.data.isPaused = false;
      console.log(`▶️ Audio stream resumed for socket: ${socket.id}`);
    }
  });

  socket.on("stop-audio", async () => {
    if (socket.data && socket.data.passThrough) {
      socket.data.passThrough.end(); // Close stream
      console.log(`⏹️ Audio stream ended for socket: ${socket.id}`);
    }
  });

  socket.on("disconnect", async () => {
    console.log("❌ Socket disconnected:", socket.id);
    if (socket.data && socket.data.passThrough) {
      socket.data.passThrough.end(); // Ensure stream is closed on disconnect
      console.log(
        `🛑 Finalizing upload after disconnect for socket: ${socket.id}`,
      );
    }
  });
});

// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
