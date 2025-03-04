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

const activeStreams = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("start-audio", async (data: { contentType?: string; fileKey?: string }) => {
    const contentType = data?.contentType || "audio/webm";
    const fileKey = data?.fileKey;

    if (!fileKey) {
      console.error(`❌ No fileKey received for socket: ${socket.id}. Ignoring request.`);
      return;
    }

    let passThrough;

    if (activeStreams.has(fileKey)) {
      console.log(`🔄 Resuming stream for ${fileKey}`);
      passThrough = activeStreams.get(fileKey);
    } else {
      console.log(`🎤 Creating new stream for ${fileKey}`);
      passThrough = new PassThrough();
      activeStreams.set(fileKey, passThrough);

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
    }

    socket.data = {
      passThrough,
      fileKey,
      contentType,
      isPaused: false,
    };

    console.log(`🎤 Streaming for ${socket.id} with fileKey ${fileKey}`);
  });

  socket.on("resume-audio", (data: { fileKey?: string }) => {
    const { fileKey } = data;
    if (fileKey && activeStreams.has(fileKey)) {
      console.log(`🔄 Resuming audio for fileKey: ${fileKey}`);
      socket.data = {
        passThrough: activeStreams.get(fileKey),
        fileKey,
        isPaused: false,
      };
    } else {
      console.warn(`⚠️ No existing stream found for ${fileKey}, unable to resume.`);
    }
  });

  socket.on("audio-chunk", (data: { buffer: Buffer | ArrayBuffer | { data: number[] }; hash: string }) => {
    const socketData = socket.data;
    if (!socketData || !socketData.passThrough || socketData.isPaused) {
      console.error(`⚠️ Received chunk but no active stream for socket: ${socket.id}`);
      return;
    }
  
    try {
      let buffer: Buffer;
  
      // If data.buffer is already a Buffer, use it directly
      if (Buffer.isBuffer(data.buffer)) {
        buffer = data.buffer;
      }
      // If data.buffer is an ArrayBuffer, convert it
      else if (data.buffer instanceof ArrayBuffer) {
        buffer = Buffer.from(new Uint8Array(data.buffer));
      }
      // If data.buffer is an object (possibly a JSON-serialized Buffer), extract the `data` array
      else if (typeof data.buffer === "object" && "data" in data.buffer && Array.isArray(data.buffer.data)) {
        buffer = Buffer.from(data.buffer.data);
      }
      // Handle unknown formats
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

  socket.on("disconnect", async () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
