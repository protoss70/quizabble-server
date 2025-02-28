import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { PassThrough } from "stream";
import { connectDB } from "./services/database";
import { streamToS3 } from "./services/storage";
import cors from "cors";

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
  })
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

  socket.on("start-audio", async (data: { contentType?: string }) => {
    const contentType = data?.contentType || "audio/webm";
    const timestamp = Date.now();
    const fileExtension = contentType.split("/")[1] || "webm";
    const fileKey = `class_recordings/${timestamp}.${fileExtension}`;
  
    const passThrough = new PassThrough();
  
    // Start streaming to S3 immediately
    streamToS3(passThrough, contentType, fileKey)
      .then((uploadedUrl) => {
        if (uploadedUrl) {
          socket.emit("upload-success", { url: uploadedUrl });
          console.log(`Upload successful for ${fileKey}: ${uploadedUrl}`);
        } else {
          socket.emit("upload-error", { error: "Failed to upload audio" });
        }
      })
      .catch((err) => {
        console.error("Error uploading audio stream:", err);
        socket.emit("upload-error", { error: "Failed to upload audio" });
      });
  
    // Store stream in socket data for real-time writing
    socket.data = {
      passThrough,
      fileKey,
      contentType,
      isPaused: false, // Track pause state
    };
  
    console.log(
      `Started real-time S3 streaming for socket ${socket.id} with key ${fileKey}`
    );
  });
  
  socket.on("audio-chunk", (chunk: ArrayBuffer | Buffer) => {
    const data = socket.data;
    if (data && data.passThrough && !data.isPaused) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      data.passThrough.write(buffer); // Write to the S3 streaming upload
    }
  });
  
  socket.on("pause-audio", () => {
    if (socket.data) {
      socket.data.isPaused = true;
      console.log(`Audio stream paused for socket: ${socket.id}`);
    }
  });
  
  socket.on("resume-audio", () => {
    if (socket.data) {
      socket.data.isPaused = false;
      console.log(`Audio stream resumed for socket: ${socket.id}`);
    }
  });
  
  socket.on("stop-audio", async () => {
    if (socket.data && socket.data.passThrough) {
      socket.data.passThrough.end(); // Close stream
      console.log(`Audio stream ended for socket: ${socket.id}`);
    }
  });
  
  socket.on("disconnect", async () => {
    console.log("Socket disconnected:", socket.id);
    if (socket.data && socket.data.passThrough) {
      socket.data.passThrough.end(); // Ensure stream is closed on disconnect
      console.log(`Finalizing upload after disconnect for socket: ${socket.id}`);
    }
  });
  
});

// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
