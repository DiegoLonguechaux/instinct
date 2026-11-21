/**
 * Migre les fichiers Vercel Blob référencés en base vers le bucket S3.
 *
 *   node --env-file=.env.local scripts/migrate-blob-to-s3.mjs           # dry-run (par défaut)
 *   node --env-file=.env.local scripts/migrate-blob-to-s3.mjs --apply   # écrit pour de bon
 *
 * Déroulé :
 *   1. scan de toutes les collections : chaînes (y compris imbriquées, dans des
 *      tableaux ou du HTML) contenant public.blob.vercel-storage.com ;
 *   2. (--apply) copie de chaque URL distincte vers S3, une seule fois, sous
 *      uploads/migrated/<chemin d'origine> ;
 *   3. (--apply) seulement si TOUTES les copies ont réussi : remplacement des
 *      URLs en base, un seul updateOne par document.
 * Une erreur pendant les copies s'arrête avant toute écriture en base. Le
 * script est relançable : les objets déjà copiés sont sautés et les documents
 * déjà réécrits ne contiennent plus d'URL Blob.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { writeFileSync } from 'node:fs';
import mongoose from 'mongoose';

const BLOB_HOST_FRAGMENT = 'public.blob.vercel-storage.com';
const BLOB_URL_PATTERN = /https?:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s"'<>()\\]*/gi;
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

const CONTENT_TYPES_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  pdf: 'application/pdf',
  zip: 'application/zip',
};

const apply = process.argv.includes('--apply');

class MigrationError extends Error {}

function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new MigrationError(`Variable(s) manquante(s) : ${missing.join(', ')} (lance le script avec --env-file=.env.local).`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

/** Parcourt tableaux et objets simples (ObjectId, Date, Binary... sont ignorés). */
function collectUrls(value, path, found) {
  if (typeof value === 'string') {
    if (value.includes(BLOB_HOST_FRAGMENT)) {
      for (const url of value.match(BLOB_URL_PATTERN) ?? []) {
        found.push({ path, url });
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectUrls(item, `${path}[${index}]`, found));
  } else if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      collectUrls(item, path ? `${path}.${key}` : key, found);
    }
  }
}

/** Copie profonde avec remplacement des URLs ; renvoie [nouvelleValeur, modifiée]. */
function replaceUrls(value, mapping) {
  if (typeof value === 'string') {
    if (!value.includes(BLOB_HOST_FRAGMENT)) {
      return [value, false];
    }
    const replaced = value.replace(BLOB_URL_PATTERN, (url) => mapping.get(url) ?? url);
    return [replaced, replaced !== value];
  }
  if (Array.isArray(value)) {
    let changed = false;
    const items = value.map((item) => {
      const [next, itemChanged] = replaceUrls(item, mapping);
      changed ||= itemChanged;
      return next;
    });
    return [changed ? items : value, changed];
  }
  if (isPlainObject(value)) {
    let changed = false;
    const entries = Object.entries(value).map(([key, item]) => {
      const [next, itemChanged] = replaceUrls(item, mapping);
      changed ||= itemChanged;
      return [key, next];
    });
    return [changed ? Object.fromEntries(entries) : value, changed];
  }
  return [value, false];
}

/** Clé S3 et URL publique de destination pour une URL Blob. */
function destinationFor(blobUrl, publicBaseUrl) {
  const pathname = decodeURIComponent(new URL(blobUrl).pathname).replace(/^\/+/, '');
  const key = `uploads/migrated/${pathname}`;
  const publicUrl = `${publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  return { key, publicUrl };
}

async function objectExists(s3, bucket, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

async function copyToS3(s3, bucket, blobUrl, key) {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new MigrationError(`Téléchargement impossible (${response.status}) : ${blobUrl}`);
  }

  const extension = key.split('.').pop()?.toLowerCase() ?? '';
  const contentType =
    response.headers.get('content-type')?.split(';')[0].trim() ||
    CONTENT_TYPES_BY_EXTENSION[extension] ||
    'application/octet-stream';

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(await response.arrayBuffer()),
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
      ACL: 'public-read',
    })
  );
}

async function main() {
  requireEnv(['MONGODB_URI']);
  if (apply) {
    requireEnv(['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_BASE_URL']);
  }
  const publicBaseUrl = (process.env.S3_PUBLIC_BASE_URL ?? 'https://<S3_PUBLIC_BASE_URL>').trim().replace(/\/+$/, '');

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`Base : ${db.databaseName}`);
  console.log(apply ? 'Mode : APPLY (écriture)' : 'Mode : dry-run (aucune modification)');

  // 1. Scan.
  const documents = []; // { collection, id, urls: [{ path, url }] }
  const uniqueUrls = new Set();
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (name.startsWith('system.')) {
      continue;
    }
    for await (const doc of db.collection(name).find({})) {
      const urls = [];
      collectUrls(doc, '', urls);
      if (urls.length > 0) {
        documents.push({ collection: name, id: doc._id, urls });
        urls.forEach(({ url }) => uniqueUrls.add(url));
      }
    }
  }

  console.log(`\n${documents.length} document(s) concerné(s), ${uniqueUrls.size} URL(s) distincte(s).`);
  for (const { collection, id, urls } of documents) {
    for (const { path, url } of urls) {
      console.log(`  ${collection}/${id} ${path}\n    ${url}\n    -> ${destinationFor(url, publicBaseUrl).publicUrl}`);
    }
  }

  if (!apply) {
    console.log('\nDry-run terminé : rien n’a été copié ni modifié. Relance avec --apply pour migrer.');
    return;
  }
  if (uniqueUrls.size === 0) {
    console.log('\nRien à migrer.');
    return;
  }

  // 2. Copies vers S3 (aucune écriture en base tant qu'elles ne sont pas toutes réussies).
  const s3 = new S3Client({
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

  const mapping = new Map();
  let copied = 0;
  let skipped = 0;
  for (const url of uniqueUrls) {
    const { key, publicUrl } = destinationFor(url, publicBaseUrl);
    if (await objectExists(s3, bucket, key)) {
      skipped += 1;
    } else {
      await copyToS3(s3, bucket, url, key);
      copied += 1;
      console.log(`Copié : ${key}`);
    }
    mapping.set(url, publicUrl);
  }
  console.log(`\nS3 : ${copied} fichier(s) copié(s), ${skipped} déjà présent(s).`);

  const mappingFile = `migration-blob-s3-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(mappingFile, JSON.stringify(Object.fromEntries(mapping), null, 2));
  console.log(`Correspondance ancienne -> nouvelle URL : ${mappingFile}`);

  // 3. Réécriture en base : un seul updateOne atomique par document.
  let updated = 0;
  for (const { collection, id } of documents) {
    const collectionHandle = db.collection(collection);
    const doc = await collectionHandle.findOne({ _id: id });
    if (!doc) {
      continue;
    }

    const changes = {};
    for (const [field, value] of Object.entries(doc)) {
      if (field === '_id') {
        continue;
      }
      const [next, changed] = replaceUrls(value, mapping);
      if (changed) {
        changes[field] = next;
      }
    }

    if (Object.keys(changes).length > 0) {
      await collectionHandle.updateOne({ _id: id }, { $set: changes });
      updated += 1;
    }
  }
  console.log(`Base : ${updated} document(s) mis à jour.`);
}

try {
  await main();
} catch (error) {
  console.error(`\nErreur : ${error instanceof Error ? error.message : error}`);
  console.error(
    apply
      ? 'Arrêt. Les documents déjà réécrits restent cohérents (un updateOne par document) ; relance le script pour terminer.'
      : 'Arrêt (dry-run, rien n’a été modifié).'
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
