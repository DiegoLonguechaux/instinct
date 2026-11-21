import { MAX_IMAGE_SIZE } from './limits';

const MAX_DIMENSION = 2560;
const QUALITY = 0.85;

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

function renameWithExtension(name: string, extension: string) {
  const base = name.replace(/\.[^./\\]+$/, '') || 'image';
  return `${base}.${extension}`;
}

/**
 * Réencode toujours l'image via un canvas, même si elle est petite : le canvas
 * ne conserve aucune métadonnée, ce qui supprime l'EXIF (position GPS
 * notamment) avant que le fichier quitte le navigateur. L'orientation EXIF est
 * appliquée au décodage, donc la photo reste à l'endroit. Réduit au passage à
 * 2560 px de côté maximum (jamais d'agrandissement). Sortie en WebP, qui garde
 * la transparence des logos.
 */
export async function reencodeImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Image illisible ou format non pris en charge par ce navigateur.');
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Traitement de l’image impossible dans ce navigateur.');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await canvasToBlob(canvas, 'image/webp');
  // Un navigateur qui ne sait pas encoder en WebP renvoie du PNG : repli JPEG,
  // sur fond blanc car le JPEG n'a pas de transparence.
  if (!blob || blob.type !== 'image/webp') {
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, 'image/jpeg');
  }

  if (!blob) {
    throw new Error('Traitement de l’image impossible dans ce navigateur.');
  }
  if (blob.size > MAX_IMAGE_SIZE) {
    throw new Error('Image trop lourde (maximum 10 Mo).');
  }

  return new File([blob], renameWithExtension(file.name, blob.type === 'image/webp' ? 'webp' : 'jpg'), {
    type: blob.type,
  });
}
