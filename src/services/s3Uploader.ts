import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import dotenv from "dotenv";

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
export async function uploadFileToS3(
  fileId: string,
  folderPath: string,
  fileBuffer: Buffer,
  mimeType: string
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
