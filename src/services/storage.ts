import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import dotenv from "dotenv";
import { PassThrough } from "stream";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";

dotenv.config();

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME as string;
const S3_REGION = process.env.S3_REGION as string;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY as string;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY as string;

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
});

/**
 * Uploads a file to an S3 bucket.
 * @param fileId - A unique identifier for the file.
 * @param folderPath - The folder path where the file should be stored.
 * @param fileBuffer - The file content as a Buffer.
 * @param mimeType - The MIME type of the file.
 * @returns The URL of the uploaded file if successful, otherwise null.
 */
export async function uploadFileToStorage(
  fileId: string,
  folderPath: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string | null> {
  try {
    // Use path.posix.join to ensure the folder separator is '/'
    const fileKey = path.posix.join(folderPath, `${fileId}-${uuidv4()}`);

    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: mimeType,
    };

    await s3.send(new PutObjectCommand(uploadParams));
    return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    return null;
  }
}

/**
 * Downloads a file from S3 and returns its stream.
 * @param fileId - The unique file identifier.
 * @param folderPath - The folder in the S3 bucket where the file is located.
 * @returns A ReadableStream of the file if successful, otherwise null.
 */
export async function getFileFromStorage(
  fileId: string,
  folderPath: string,
): Promise<NodeJS.ReadableStream | null> {
  const fileKey = path.posix.join(folderPath, fileId);
  try {
    const params = { Bucket: S3_BUCKET_NAME, Key: fileKey };
    const { Body } = await s3.send(new GetObjectCommand(params));
    if (!Body) {
      throw new Error("File not found or empty");
    }
    console.log(`Successfully obtained stream for ${fileKey}`);
    return Body as NodeJS.ReadableStream;
  } catch (error) {
    console.error("Error downloading file stream from S3:", error);
    return null;
  }
}

/**
 * Converts a Web ReadableStream to a Node.js Readable Stream.
 */
function webStreamToNodeStream(
  webStream: ReadableStream<Uint8Array>,
): Readable {
  const reader = webStream.getReader();
  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) {
        this.push(null);
      } else {
        this.push(Buffer.from(value));
      }
    },
  });
}

/**
 * Streams audio data directly to S3.
 * @param stream - The readable stream containing audio data.
 * @param contentType - The MIME type of the audio stream.
 * @returns The URL of the uploaded file if successful, otherwise null.
 */
export async function streamToS3(
  stream: NodeJS.ReadableStream,
  contentType: string,
  fileKey: string,
): Promise<string | null> {
  try {
    console.log(`Streaming upload started for ${fileKey}`);

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey,
        Body: stream as Readable, // Ensure this is a proper Node.js Readable stream
        ContentType: contentType,
      },
    });

    await upload.done(); // Wait for upload completion

    return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;
  } catch (error) {
    console.error("Error streaming file to S3:", error);
    return null;
  }
}

/**
 * Starts a streaming upload to S3 using a provided readable stream.
 *
 * @param passThrough - The Node.js Readable stream (e.g. a PassThrough stream)
 * @param contentType - The MIME type of the audio data (e.g., "audio/webm")
 * @param fileKey - The unique file key under which the data will be stored in S3
 * @returns The URL of the uploaded file if successful.
 */
export async function startStreamingUploadToS3(
  passThrough: NodeJS.ReadableStream,
  contentType: string,
  fileKey: string,
): Promise<string> {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: S3_BUCKET_NAME,
      Key: fileKey,
      Body: passThrough as Readable,
      ContentType: contentType,
    },
    // Optionally adjust partSize or concurrency here
  });

  await upload.done();

  return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;
}
