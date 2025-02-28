import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { PassThrough } from "stream";
import { connectDB } from "./services/database";
import { streamToS3 } from "./services/storage";

dotenv.config();
const app = express();
app.use(express.json());

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
    origin: "*", // Adjust this for production
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("start-audio", (data: { contentType?: string }) => {
    const contentType = data?.contentType || "audio/webm";
    const timestamp = Date.now();
    const fileExtension = contentType.split("/")[1] || "webm";
    const fileKey = `class_recordings/${timestamp}.${fileExtension}`;

    const passThrough = new PassThrough();
    socket.data = {
      passThrough,
      fileKey,
      contentType,
      uploadTriggered: false,
      isPaused: false, // New flag to track pause state
    };

    console.log(
      `Started S3 streaming upload for socket ${socket.id} with key ${fileKey}`,
    );
  });

  // Handle incoming audio chunks, but only if not paused
  socket.on("audio-chunk", (chunk: ArrayBuffer | Buffer) => {
    const data = socket.data;
    if (data && data.passThrough && !data.isPaused) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      data.passThrough.write(buffer);
    }
  });

  // Handle pause event
  socket.on("pause-audio", () => {
    if (socket.data) {
      socket.data.isPaused = true;
      console.log(`Audio stream paused for socket: ${socket.id}`);
    }
  });

  // Handle resume event
  socket.on("resume-audio", () => {
    if (socket.data) {
      socket.data.isPaused = false;
      console.log(`Audio stream resumed for socket: ${socket.id}`);
    }
  });

  // Stop recording and finalize the upload
  socket.on("stop-audio", async () => {
    const data = socket.data;
    if (
      data &&
      data.passThrough &&
      data.fileKey &&
      data.contentType &&
      !data.uploadTriggered
    ) {
      data.passThrough.end();
      console.log("Audio stream ended for socket:", socket.id);
      try {
        const uploadedUrl = await streamToS3(
          data.passThrough,
          data.contentType,
          data.fileKey,
        );
        socket.emit("upload-success", { url: uploadedUrl });
      } catch (err) {
        console.error("Error uploading audio stream:", err);
        socket.emit("upload-error", { error: "Failed to upload audio" });
      }
      data.uploadTriggered = true;
    }
  });

  // Handle disconnection and finalize the upload
  socket.on("disconnect", async () => {
    console.log("Socket disconnected:", socket.id);
    const data = socket.data;
    if (data && data.passThrough && !data.uploadTriggered) {
      data.passThrough.end();
      console.log("Finalizing upload after disconnect for socket:", socket.id);
      try {
        const uploadedUrl = await streamToS3(
          data.passThrough,
          data.contentType,
          data.fileKey,
        );
        console.log("Upload successful on disconnect, URL:", uploadedUrl);
      } catch (err) {
        console.error("Error uploading audio stream on disconnect:", err);
      }
      data.uploadTriggered = true;
    }
  });
});


// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
