// Limites partagées entre le navigateur et le serveur : ce fichier ne doit
// importer aucun module Node (il est embarqué dans le bundle client).
const MB = 1024 * 1024;

export const MAX_IMAGE_SIZE = 10 * MB;
export const MAX_PDF_SIZE = 20 * MB;
export const MAX_ZIP_SIZE = 200 * MB;
