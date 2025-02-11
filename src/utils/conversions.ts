/**
 * Helper function to convert a NodeJS.ReadableStream to a Buffer.
 * @param stream - The input stream.
 * @returns A Promise that resolves to a Buffer.
 */
export function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

