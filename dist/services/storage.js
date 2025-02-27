"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToStorage = uploadFileToStorage;
exports.getFileFromStorage = getFileFromStorage;
exports.streamToS3 = streamToS3;
exports.startStreamingUploadToS3 = startStreamingUploadToS3;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const lib_storage_1 = require("@aws-sdk/lib-storage");
const stream_1 = require("stream");
dotenv_1.default.config();
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_REGION = process.env.S3_REGION;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const s3 = new client_s3_1.S3Client({
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
function uploadFileToStorage(fileId, folderPath, fileBuffer, mimeType) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Use path.posix.join to ensure the folder separator is '/'
            const fileKey = path_1.default.posix.join(folderPath, `${fileId}-${(0, uuid_1.v4)()}`);
            const uploadParams = {
                Bucket: S3_BUCKET_NAME,
                Key: fileKey,
                Body: fileBuffer,
                ContentType: mimeType,
            };
            yield s3.send(new client_s3_1.PutObjectCommand(uploadParams));
            return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;
        }
        catch (error) {
            console.error("Error uploading file to S3:", error);
            return null;
        }
    });
}
/**
 * Downloads a file from S3 and returns its stream.
 * @param fileId - The unique file identifier.
 * @param folderPath - The folder in the S3 bucket where the file is located.
 * @returns A ReadableStream of the file if successful, otherwise null.
 */
function getFileFromStorage(fileId, folderPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileKey = path_1.default.posix.join(folderPath, fileId);
        try {
            const params = { Bucket: S3_BUCKET_NAME, Key: fileKey };
            const { Body } = yield s3.send(new client_s3_1.GetObjectCommand(params));
            if (!Body) {
                throw new Error("File not found or empty");
            }
            console.log(`Successfully obtained stream for ${fileKey}`);
            return Body;
        }
        catch (error) {
            console.error("Error downloading file stream from S3:", error);
            return null;
        }
    });
}
/**
 * Converts a Web ReadableStream to a Node.js Readable Stream.
 */
function webStreamToNodeStream(webStream) {
    const reader = webStream.getReader();
    return new stream_1.Readable({
        read() {
            return __awaiter(this, void 0, void 0, function* () {
                const { done, value } = yield reader.read();
                if (done) {
                    this.push(null);
                }
                else {
                    this.push(Buffer.from(value));
                }
            });
        },
    });
}
function streamToS3(stream, contentType, fileKey) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`Streaming upload started for ${fileKey}`);
            const upload = new lib_storage_1.Upload({
                client: s3,
                params: {
                    Bucket: S3_BUCKET_NAME,
                    Key: fileKey,
                    Body: stream, // Streaming directly
                    ContentType: contentType,
                },
            });
            yield upload.done(); // Upload happens in real-time
            return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;
        }
        catch (error) {
            console.error("Error streaming file to S3:", error);
            return null;
        }
    });
}
/**
 * Starts a streaming upload to S3 using a provided readable stream.
 *
 * @param passThrough - The Node.js Readable stream (e.g. a PassThrough stream)
 * @param contentType - The MIME type of the audio data (e.g., "audio/webm")
 * @param fileKey - The unique file key under which the data will be stored in S3
 * @returns The URL of the uploaded file if successful.
 */
function startStreamingUploadToS3(passThrough, contentType, fileKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const upload = new lib_storage_1.Upload({
            client: s3,
            params: {
                Bucket: S3_BUCKET_NAME,
                Key: fileKey,
                Body: passThrough,
                ContentType: contentType,
            },
            // Optionally adjust partSize or concurrency here
        });
        yield upload.done();
        return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;
    });
}
