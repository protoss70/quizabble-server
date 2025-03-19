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
        if (data.chunkIndex % 100 === 0){
          socket.emit("clear-chunks", { checkpoint: data.chunkIndex })
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

    if (socket.data && socket.data.passThrough) {
        const { fileKey, passThrough } = socket.data;
        console.log(`🛑 Connection lost, keeping stream active for fileKey: ${fileKey}`);

        let elapsedSeconds = 0;
        const interval = setInterval(() => {
            if (elapsedSeconds >= 60) {
                clearInterval(interval); // Stop checking after 60 seconds
            }
            const isFileKeyInUse = [...io.sockets.sockets.values()].some(
                (s) => s.data?.fileKey === fileKey
            );

            if (isFileKeyInUse) {
                console.log(`🔄 Reconnection detected, keeping stream active for ${fileKey}`);
                clearInterval(interval); // Stop checking if reconnection is found
            } else if (elapsedSeconds >= 60) {
                console.log(`⏹️ No reconnection detected, finalizing upload for ${fileKey}`);
                passThrough.end(); // Close stream
                activeStreams.delete(fileKey); // Clean up
                clearInterval(interval);
            }

            elapsedSeconds++;
        }, 1000); // Check every second
    }
});
});

// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
