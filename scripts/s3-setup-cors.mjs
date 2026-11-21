/**
 * Applique la configuration CORS du bucket S3 (nécessaire pour que le
 * navigateur puisse faire son PUT direct vers l'URL pré-signée).
 * À lancer une seule fois :
 *   node --env-file=.env.local scripts/s3-setup-cors.mjs
 */
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

const ALLOWED_ORIGINS = ['https://instinctofficial.fr', 'http://localhost:3000'];

const required = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(`Variable(s) manquante(s) : ${missing.join(', ')} (lance le script avec --env-file=.env.local).`);
  process.exit(1);
}

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT.trim(),
  region: process.env.S3_REGION.trim(),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY.trim(),
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});
const bucket = process.env.S3_BUCKET.trim();

try {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedMethods: ['PUT', 'GET'],
            AllowedOrigins: ALLOWED_ORIGINS,
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    })
  );

  const { CORSRules } = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log(`CORS appliqué sur le bucket "${bucket}" :`);
  console.log(JSON.stringify(CORSRules, null, 2));
} catch (error) {
  console.error(`Impossible d'appliquer le CORS : ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
