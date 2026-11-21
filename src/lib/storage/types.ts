import type { UploadFolder } from './policy';

export type CreateUploadUrlInput = {
  folder: UploadFolder;
  contentType: string;
  size: number;
};

export type CreateUploadUrlResult = {
  /** URL pré-signée à appeler en PUT depuis le navigateur. */
  uploadUrl: string;
  /** URL publique définitive du fichier, à stocker en base. */
  publicUrl: string;
  /** En-têtes à envoyer tels quels avec le PUT (ils font partie de la signature). */
  headers: Record<string, string>;
};

/**
 * Le code métier ne parle qu'à cette interface : changer de fournisseur de
 * stockage ne doit toucher que l'adaptateur.
 */
export interface StorageProvider {
  createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult>;
}
