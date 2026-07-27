/**
 * Storage provider factory.
 * Returns the configured provider based on STORAGE_PROVIDER env var.
 * Default: "s3"
 */
import type { StorageProvider } from "./provider";

let _provider: StorageProvider | null = null;

export async function getStorageProvider(): Promise<StorageProvider> {
  if (_provider) return _provider;

  const providerName = process.env.STORAGE_PROVIDER || "s3";

  switch (providerName) {
    case "s3": {
      const { S3StorageAdapter } = await import("./s3");
      _provider = new S3StorageAdapter();
      break;
    }
    // Future providers:
    // case "gcs": { ... }
    // case "r2": { ... }
    default:
      throw new Error(`Unknown storage provider: ${providerName}`);
  }

  return _provider;
}

export type { StorageProvider, PresignedUrlResult } from "./provider";
