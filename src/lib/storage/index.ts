import { S3StorageProvider } from './s3';
import type { StorageProvider } from './types';

export type { CreateUploadUrlInput, CreateUploadUrlResult, StorageProvider } from './types';
export { UPLOAD_FOLDERS, getUploadRule, isUploadFolder } from './policy';
export type { UploadFolder } from './policy';
export { isS3Configured } from './config';

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!provider) {
    provider = new S3StorageProvider();
  }
  return provider;
}
