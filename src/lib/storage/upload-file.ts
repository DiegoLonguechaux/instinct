import type { UploadFolder } from './policy';

type UploadFileOptions = {
  /** Progression de l'envoi, de 0 à 100. */
  onProgress?: (percent: number) => void;
};

type UploadUrlResponse = {
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
};

async function requestUploadUrl(file: File, folder: UploadFolder): Promise<UploadUrlResponse> {
  const response = await fetch('/api/admin/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, contentType: file.type, size: file.size }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? 'Upload impossible.');
  }
  return data as UploadUrlResponse;
}

// XMLHttpRequest plutôt que fetch : seul moyen d'obtenir la progression de l'envoi.
function putFile(file: File, { uploadUrl, headers }: UploadUrlResponse, onProgress?: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    // Content-Length est posé par le navigateur ; les autres en-têtes sont ceux de la signature.
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error('Le stockage a refusé le fichier.'));
      }
    };
    xhr.onerror = () => reject(new Error('Envoi du fichier impossible, vérifiez votre connexion.'));
    xhr.onabort = () => reject(new Error('Envoi du fichier interrompu.'));

    xhr.send(file);
  });
}

/**
 * Envoie un fichier directement vers le stockage (URL pré-signée obtenue
 * auprès de /api/admin/upload-image) et renvoie son URL publique.
 * Lève une Error au message lisible, affichable tel quel.
 */
export async function uploadFile(file: File, folder: UploadFolder, options: UploadFileOptions = {}) {
  const upload = await requestUploadUrl(file, folder);
  await putFile(file, upload, options.onProgress);
  return upload.publicUrl;
}
