/**
 * Generic StorageProvider interface.
 * Swap providers (S3 → GCS → R2 → local) by creating a new adapter
 * that implements this interface. No business logic changes needed outside
 * the adapter and the presign route.
 */

export interface PresignedUrlResult {
  /** The presigned PUT URL the client uploads to directly */
  uploadUrl: string;
  /** The final object key / public URL to store in the DB */
  objectKey: string;
}

export interface StorageProvider {
  /** Human-readable provider name */
  readonly name: string;

  /**
   * Generate a presigned PUT URL for direct client upload.
   * The client PUTs the file binary directly to storage — no server round-trip
   * for the actual bytes.
   */
  getPresignedUploadUrl(params: {
    bucket: string;
    key: string;
    contentType: string;
    expiresIn?: number; // seconds, default 300
  }): Promise<PresignedUrlResult>;
}
