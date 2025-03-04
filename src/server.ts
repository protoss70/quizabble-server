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

      socket.data = { passThrough, fileKey, lastChunkIndex, lastEmit: 0 };

      console.log(
        `🎙️ Streaming setup for ${socket.id} with fileKey ${fileKey}, last received chunk: ${lastChunkIndex}`,
      );

      // Inform frontend of the last received chunk index
      socket.emit("chunk-index", { lastChunkIndex });
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
        if (socket.data.lastEmit <= 0) {
          console.log("Sent chunk index", lastChunkIndex + 1)
          socket.emit("chunk-index", { lastChunkIndex: lastChunkIndex + 1 });
          socket.data.lastEmit = 11;
        }
        socket.data.lastEmit -= 1;
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
        console.log(
          `📝 Received and stored chunk ${data.chunkIndex} for ${fileKey}`,
        );
      } catch (error) {
        console.error(
          `❌ Error processing audio chunk for socket: ${socket.id}`,
          error,
        );
      }
    },
  );

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);

    if (socket.data && socket.data.passThrough) {
      const { fileKey, passThrough } = socket.data;
      console.log(
        `🛑 Connection lost, keeping stream active for fileKey: ${fileKey}`,
      );

      // Wait for some time before finalizing the upload (grace period for reconnects)
      setTimeout(() => {
        if (activeStreams.has(fileKey)) {
          console.log(`🔍 Checking for reconnects on ${fileKey}...`);
          if (!io.sockets.adapter.rooms.has(fileKey)) {
            console.log(
              `⏹️ No reconnection detected, finalizing upload for ${fileKey}`,
            );
            passThrough.end(); // Close stream
            activeStreams.delete(fileKey); // Clean up
          } else {
            console.log(
              `🔄 Reconnection detected, keeping stream active for ${fileKey}`,
            );
          }
        }
      }, 10000); // 10 seconds grace period for reconnect
    }
  });
});

// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
