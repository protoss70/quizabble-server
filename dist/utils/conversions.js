"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamToBuffer = streamToBuffer;
/**
 * Helper function to convert a NodeJS.ReadableStream to a Buffer.
 * @param stream - The input stream.
 * @returns A Promise that resolves to a Buffer.
 */
function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => {
            chunks.push(chunk);
        });
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
}
