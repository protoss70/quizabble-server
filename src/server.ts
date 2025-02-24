import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { PassThrough } from "stream";
import { connectDB } from "./services/database";
import { streamToS3 } from "./services/storage";
import fs from "fs";
import https from "https";

dotenv.config();
const app = express();
app.use(express.json());

// Connect to the database
connectDB();

app.get("/", (req: Request, res: Response) => {
  res.send("Server running");
});

let httpServer;
if (process.env.ENVIRONMENT === "local") {
  // Use HTTPS locally with PEM files
  httpServer = https.createServer(
    {
      key: fs.readFileSync("./server-key.pem"),
      cert: fs.readFileSync("./server.pem"),
    },
    app
  );
  console.log("Running with HTTPS locally");
} else {
  httpServer = createServer(app);
}

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
    socket.data = { passThrough, fileKey, contentType, uploadTriggered: false };
    console.log(`Started S3 streaming upload for socket ${socket.id} with key ${fileKey}`);
  });

  socket.on("audio-chunk", (chunk: ArrayBuffer | Buffer) => {
    const data = socket.data;
    if (data && data.passThrough) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      data.passThrough.write(buffer);
    }
  });

  socket.on("stop-audio", async () => {
    const data = socket.data;
    if (data && data.passThrough && data.fileKey && data.contentType && !data.uploadTriggered) {
      data.passThrough.end();
      console.log("Audio stream ended for socket:", socket.id);
      try {
        const uploadedUrl = await streamToS3(data.passThrough, data.contentType);
        socket.emit("upload-success", { url: uploadedUrl });
      } catch (err) {
        console.error("Error uploading audio stream:", err);
        socket.emit("upload-error", { error: "Failed to upload audio" });
      }
      data.uploadTriggered = true;
    }
  });

  socket.on("disconnect", async () => {
    console.log("Socket disconnected:", socket.id);
    const data = socket.data;
    if (data && data.passThrough && !data.uploadTriggered) {
      data.passThrough.end();
      console.log("Finalizing upload after disconnect for socket:", socket.id);
      try {
        const uploadedUrl = await streamToS3(data.passThrough, data.contentType);
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
