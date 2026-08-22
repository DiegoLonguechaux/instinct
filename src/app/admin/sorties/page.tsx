'use client';

import { upload } from '@vercel/blob/client';
import { AdminModal } from '@/components/admin/admin-modal';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminCrud } from '@/hooks/use-admin-crud';
import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { useMemo, useState } from 'react';

type ReleaseType = 'single' | 'ep' | 'album';

type ReleaseLinks = {
  spotify: string;
  deezer: string;
  appleMusic: string;
  amazonMusic: string;
  youtubeMusic: string;
  bandcamp: string;
  soundcloud: string;
};

type Release = {
  id: string;
  type: ReleaseType;
  name: string;
  coverUrl: string;
  links: ReleaseLinks;
  createdAt: string;
};

type ReleaseForm = {
  type: ReleaseType;
  name: string;
  coverUrl: string;
  links: ReleaseLinks;
};

const emptyLinks: ReleaseLinks = {
  spotify: '',
  deezer: '',
  appleMusic: '',
  amazonMusic: '',
  youtubeMusic: '',
  bandcamp: '',
  soundcloud: '',
};

const defaultForm: ReleaseForm = {
  type: 'single',
  name: '',
  coverUrl: '',
  links: emptyLinks,
};

const releaseTypeLabel: Record<ReleaseType, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Album',
};

const PLATFORM_LINKS: { key: keyof ReleaseLinks; label: string; placeholder: string }[] = [
  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/...' },
  { key: 'deezer', label: 'Deezer', placeholder: 'https://deezer.com/...' },
  { key: 'appleMusic', label: 'Apple Music', placeholder: 'https://music.apple.com/...' },
  { key: 'amazonMusic', label: 'Amazon Music', placeholder: 'https://music.amazon...' },
  { key: 'youtubeMusic', label: 'YouTube Music', placeholder: 'https://music.youtube.com/...' },
  { key: 'bandcamp', label: 'Bandcamp', placeholder: 'https://...bandcamp.com' },
  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
];

export default function SortiesPage() {
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const crud = useAdminCrud<Release, ReleaseForm>({
    endpoint: '/api/admin/releases',
    defaultForm,
    getId: (release) => release.id,
    toForm: (release) => ({
      type: release.type,
      name: release.name,
      coverUrl: release.coverUrl,
      links: { ...emptyLinks, ...(release.links ?? {}) },
    }),
    toPayload: (form) => form,
    sortCompare: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    messages: {
      load: 'Erreur lors du chargement des sorties.',
      createSuccess: 'Sortie ajoutée avec succès.',
      updateSuccess: 'Sortie modifiée avec succès.',
      save: 'Erreur lors de l’enregistrement de la sortie.',
      deleteSuccess: 'Sortie supprimée avec succès.',
      delete: 'Erreur lors de la suppression de la sortie.',
    },
  });

  const closeFormModal = () => {
    if (isUploadingCover) {
      return;
    }
    crud.closeFormModal();
  };

  const uploadCover = async (file: File) => {
    crud.setMessage('');
    setIsUploadingCover(true);

    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload-image',
      });
      crud.setForm((prev) => ({ ...prev, coverUrl: blob.url }));
    } catch {
      crud.setMessage('Erreur lors de l’upload de la pochette.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const { openEditModal, openDeleteModal } = crud;

  const columns: ColumnDef<Release>[] = useMemo(
    () => [
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => releaseTypeLabel[row.original.type],
      },
      {
        accessorKey: 'name',
        header: 'Nom',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openEditModal(row.original)}
            >
              Modifier
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => openDeleteModal(row.original)}
            >
              Supprimer
            </Button>
          </div>
        ),
      },
    ],
    [openEditModal, openDeleteModal]
  );

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sorties</h1>
        <Button onClick={crud.openCreateModal}>Ajouter une sortie</Button>
      </div>

      {crud.message && <p className="mb-4 text-sm text-slate-600">{crud.message}</p>}

      {crud.isLoading ? (
        <p>Chargement...</p>
      ) : (
        <DataTable columns={columns} data={crud.items} emptyMessage="Aucune sortie enregistrée." />
      )}

      <AdminModal
        open={crud.isFormModalOpen}
        title={crud.isEditMode ? 'Modifier la sortie' : 'Ajouter une sortie'}
        onClose={closeFormModal}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={crud.save} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                value={crud.form.type}
                onChange={(e) =>
                  crud.setForm((prev) => ({ ...prev, type: e.target.value as ReleaseType }))
                }
              >
                <option value="single">Single</option>
                <option value="ep">EP</option>
                <option value="album">Album</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={crud.form.name}
                onChange={(e) => crud.setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nom de la sortie"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="cover">Pochette</Label>
            <Input
              id="cover"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  uploadCover(file);
                }
              }}
            />
            {isUploadingCover && <p className="text-sm text-slate-600">Upload en cours...</p>}
            {crud.form.coverUrl && (
              <Image
                src={crud.form.coverUrl}
                alt="Pochette"
                width={180}
                height={180}
                className="rounded-md border border-slate-200 object-cover"
              />
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Liens plateformes</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {PLATFORM_LINKS.map(({ key, label, placeholder }) => (
                <div className="space-y-2" key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    value={crud.form.links[key]}
                    onChange={(e) =>
                      crud.setForm((prev) => ({
                        ...prev,
                        links: { ...prev.links, [key]: e.target.value },
                      }))
                    }
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeFormModal}
              disabled={crud.isSaving || isUploadingCover}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={crud.isSaving || isUploadingCover}>
              {crud.isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={crud.isDeleteModalOpen}
        title="Confirmer la suppression"
        onClose={crud.closeDeleteModal}
        maxWidthClass="max-w-md"
      >
        <p className="mb-6 text-sm text-slate-600">
          Voulez-vous vraiment supprimer la sortie {crud.itemToDelete?.name ?? ''} ?
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={crud.closeDeleteModal} disabled={crud.isDeleting}>
            Annuler
          </Button>
          <Button type="button" variant="destructive" onClick={crud.remove} disabled={crud.isDeleting}>
            {crud.isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </div>
      </AdminModal>
    </div>
  );
}
