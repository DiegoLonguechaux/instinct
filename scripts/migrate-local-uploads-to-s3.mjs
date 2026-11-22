/**
 * Migre les anciens fichiers stockés sur disque (public/uploads/, référencés en
 * base par des chemins relatifs /uploads/...) vers le bucket S3.
 *
 *   node --env-file=.env.local scripts/migrate-local-uploads-to-s3.mjs           # dry-run (par défaut)
 *   node --env-file=.env.local scripts/migrate-local-uploads-to-s3.mjs --apply   # écrit pour de bon
 *   (option : --uploads-dir=<dossier>, par défaut ./public/uploads)
 *
 * À lancer là où se trouvent les fichiers (le VPS en production).
 *
 * Déroulé :
 *   1. scan de toutes les collections : chaînes (y compris imbriquées, dans des
 *      tableaux ou du HTML) contenant un chemin /uploads/... ;
 *   2. vérification que chaque fichier existe sur disque : sinon arrêt, même en
 *      dry-run, avec la liste de tous les fichiers introuvables ;
 *   3. (--apply) copie de chaque chemin distinct vers S3, une seule fois, sous
 *      uploads/migrated/legacy/<chemin sous /uploads/> ;
 *   4. (--apply) seulement si TOUTES les copies ont réussi : remplacement des
 *      chemins par l'URL publique en base, un seul updateOne par document.
 * Relançable : les objets déjà copiés sont sautés et les documents déjà
 * réécrits ne contiennent plus de chemin /uploads/. public/uploads/ n'est jamais
 * modifié ni supprimé.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

// Un chemin /uploads/... qui n'est pas la fin d'une URL absolue (l'exclusion du
// caractère précédent évite de toucher https://.../uploads/... déjà migrées).
const LOCAL_PATH_PATTERN = /(?<![\w.~%:/-])\/uploads\/[^\s"'<>()\\]+/g;
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
const uploadsDirArg = process.argv.find((arg) => arg.startsWith('--uploads-dir='));
const uploadsDir = path.resolve(uploadsDirArg ? uploadsDirArg.slice('--uploads-dir='.length) : 'public/uploads');

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
function collectPaths(value, fieldPath, found) {
  if (typeof value === 'string') {
    for (const localPath of value.match(LOCAL_PATH_PATTERN) ?? []) {
      found.push({ path: fieldPath, localPath });
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectPaths(item, `${fieldPath}[${index}]`, found));
  } else if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      collectPaths(item, fieldPath ? `${fieldPath}.${key}` : key, found);
    }
  }
}

/** Copie profonde avec remplacement des chemins ; renvoie [nouvelleValeur, modifiée]. */
function replacePaths(value, mapping) {
  if (typeof value === 'string') {
    const replaced = value.replace(LOCAL_PATH_PATTERN, (localPath) => mapping.get(localPath) ?? localPath);
    return [replaced, replaced !== value];
  }
  if (Array.isArray(value)) {
    let changed = false;
    const items = value.map((item) => {
      const [next, itemChanged] = replacePaths(item, mapping);
      changed ||= itemChanged;
      return next;
    });
    return [changed ? items : value, changed];
  }
  if (isPlainObject(value)) {
    let changed = false;
    const entries = Object.entries(value).map(([key, item]) => {
      const [next, itemChanged] = replacePaths(item, mapping);
      changed ||= itemChanged;
      return [key, next];
    });
    return [changed ? Object.fromEntries(entries) : value, changed];
  }
  return [value, false];
}

/** Fichier source sur disque, clé S3 et URL publique de destination pour un chemin /uploads/... */
function resolveFile(localPath, publicBaseUrl) {
  const relative = decodeURIComponent(localPath.slice('/uploads/'.length));
  const filePath = path.resolve(uploadsDir, relative);
  // Un chemin stocké en base ne doit jamais pouvoir sortir de public/uploads.
  if (filePath !== uploadsDir && !filePath.startsWith(uploadsDir + path.sep)) {
    throw new MigrationError(`Chemin suspect (hors de ${uploadsDir}) : ${localPath}`);
  }

  const key = `uploads/migrated/legacy/${relative.split(path.sep).join('/')}`;
  const publicUrl = `${publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  return { filePath, key, publicUrl };
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

async function copyToS3(s3, bucket, filePath, key) {
  const extension = path.extname(filePath).slice(1).toLowerCase();
  const contentType = CONTENT_TYPES_BY_EXTENSION[extension] ?? 'application/octet-stream';
  if (!CONTENT_TYPES_BY_EXTENSION[extension]) {
    console.warn(`Extension inconnue ".${extension}", Content-Type application/octet-stream : ${key}`);
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: readFileSync(filePath),
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
  console.log(`Dossier source : ${uploadsDir}`);
  console.log(apply ? 'Mode : APPLY (écriture)' : 'Mode : dry-run (aucune modification)');

  // 1. Scan.
  const documents = []; // { collection, id, paths: [{ path, localPath }] }
  const uniquePaths = new Set();
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (name.startsWith('system.')) {
      continue;
    }
    for await (const doc of db.collection(name).find({})) {
      const paths = [];
      collectPaths(doc, '', paths);
      if (paths.length > 0) {
        documents.push({ collection: name, id: doc._id, paths });
        paths.forEach(({ localPath }) => uniquePaths.add(localPath));
      }
    }
  }

  // 2. Tous les fichiers doivent exister (arrêt sinon, même en dry-run).
  const missing = [];
  for (const localPath of uniquePaths) {
    const { filePath } = resolveFile(localPath, publicBaseUrl);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      missing.push({ localPath, filePath });
    }
  }

  console.log(`\n${documents.length} document(s) concerné(s), ${uniquePaths.size} chemin(s) distinct(s).`);
  for (const { collection, id, paths } of documents) {
    for (const { path: fieldPath, localPath } of paths) {
      console.log(`  ${collection}/${id} ${fieldPath}\n    ${localPath}\n    -> ${resolveFile(localPath, publicBaseUrl).publicUrl}`);
    }
  }

  if (missing.length > 0) {
    const list = missing.map(({ localPath, filePath }) => `  - ${localPath} (attendu : ${filePath})`).join('\n');
    throw new MigrationError(
      `${missing.length} fichier(s) référencé(s) en base introuvable(s) sur le disque :\n${list}\n` +
        'Lance le script là où se trouve public/uploads/ (ou passe --uploads-dir=...).'
    );
  }

  if (!apply) {
    console.log('\nDry-run terminé : rien n’a été copié ni modifié. Relance avec --apply pour migrer.');
    return;
  }
  if (uniquePaths.size === 0) {
    console.log('\nRien à migrer.');
    return;
  }

  // 3. Copies vers S3 (aucune écriture en base tant qu'elles ne sont pas toutes réussies).
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
  for (const localPath of uniquePaths) {
    const { filePath, key, publicUrl } = resolveFile(localPath, publicBaseUrl);
    if (await objectExists(s3, bucket, key)) {
      skipped += 1;
    } else {
      await copyToS3(s3, bucket, filePath, key);
      copied += 1;
      console.log(`Copié : ${key}`);
    }
    mapping.set(localPath, publicUrl);
  }
  console.log(`\nS3 : ${copied} fichier(s) copié(s), ${skipped} déjà présent(s).`);

  const mappingFile = `migration-local-uploads-s3-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(mappingFile, JSON.stringify(Object.fromEntries(mapping), null, 2));
  console.log(`Correspondance ancien chemin -> nouvelle URL : ${mappingFile}`);

  // 4. Réécriture en base : un seul updateOne atomique par document.
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
      const [next, changed] = replacePaths(value, mapping);
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
