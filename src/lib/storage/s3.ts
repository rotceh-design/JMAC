/**
 * S3-compatible storage adapter implementing StorageProvider.
 * All S3-specific logic lives here — never imported outside /storage.
 *
 * Works with AWS S3, Cloudflare R2, MinIO, or any S3-compatible API.
 */
import type { StorageProvider, PresignedUrlResult } from "./provider";

async function getS3Client() {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const client = new S3Client({
    region: process.env.STORAGE_REGION || "us-east-1",
    endpoint: process.env.STORAGE_ENDPOINT, // optional: for R2, MinIO, etc.
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY || "",
      secretAccessKey: process.env.STORAGE_SECRET_KEY || "",
    },
  });

  return { client, PutObjectCommand, getSignedUrl };
}

export class S3StorageAdapter implements StorageProvider {
  readonly name = "s3";

  async getPresignedUploadUrl(params: {
    bucket: string;
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<PresignedUrlResult> {
    const { client, PutObjectCommand, getSignedUrl } = await getS3Client();

    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      ContentType: params.contentType,
      // ACL: "public-read", // uncomment if bucket requires explicit ACL
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: params.expiresIn || 300,
    });

    // The object key is what we store in the DB.
    // For public buckets, construct the public URL; otherwise store just the key.
    const publicBaseUrl = process.env.STORAGE_PUBLIC_URL;
    const objectKey = publicBaseUrl
      ? `${publicBaseUrl}/${params.key}`
      : params.key;

    return { uploadUrl, objectKey };
  }
}
