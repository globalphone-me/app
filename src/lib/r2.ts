import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

// R2 client configuration (S3-compatible)
const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

/**
 * Upload an image to R2 storage
 * @param imageBuffer - The image data as a Buffer
 * @param contentType - MIME type (e.g., 'image/png')
 * @param userId - User's address or ID for naming
 * @returns The public URL of the uploaded image
 */
export async function uploadAvatarToR2(
    imageBuffer: Buffer,
    contentType: string,
    userId: string
): Promise<string> {
    // Generate unique filename with timestamp and hash
    const hash = crypto.randomBytes(8).toString("hex");
    const timestamp = Date.now();
    const extension = contentType === "image/png" ? "png" : "jpg";
    const key = `avatars/${userId}/${timestamp}-${hash}.${extension}`;

    await r2Client.send(
        new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: imageBuffer,
            ContentType: contentType,
        })
    );

    // Return the public URL
    return `${PUBLIC_URL}/${key}`;
}
