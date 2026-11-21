import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Config, type S3Config } from './config';
import { generateObjectKey, getUploadRule } from './policy';
import type { CreateUploadUrlInput, CreateUploadUrlResult, StorageProvider } from './types';

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const ACL = 'public-read';

export class S3StorageProvider implements StorageProvider {
  private readonly config: S3Config;
  private readonly client: S3Client;

  constructor(config: S3Config = getS3Config()) {
    this.config = config;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      // Les SDK récents ajoutent un en-tête de checksum que le navigateur ne
      // saurait pas calculer et que les stockages S3-compatibles gèrent mal.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async createUploadUrl({ folder, contentType, size }: CreateUploadUrlInput): Promise<CreateUploadUrlResult> {
    const rule = getUploadRule(folder, contentType);
    if (!rule || size > rule.maxSize) {
      throw new Error('Fichier non autorisé.');
    }

    const key = generateObjectKey(folder, rule.extension);

    // ContentType / ContentLength / CacheControl / ACL sont signés : S3 refuse
    // un PUT dont le type, la taille ou les en-têtes diffèrent de ceux validés ici.
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      CacheControl: CACHE_CONTROL,
      ACL: ACL,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(['content-type', 'content-length', 'cache-control']),
      // Sans ça, x-amz-acl serait déplacé dans la query string : on veut que
      // le client l'envoie en en-tête, comme les autres.
      unhoistableHeaders: new Set(['x-amz-acl']),
    });

    return {
      uploadUrl,
      publicUrl: `${this.config.publicBaseUrl}/${key}`,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': CACHE_CONTROL,
        'x-amz-acl': ACL,
      },
    };
  }
}
