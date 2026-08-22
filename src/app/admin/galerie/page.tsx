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

type GalleryItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: string;
};

type GalleryForm = {
  title: string;
  description: string;
  imageUrl: string;
};

const defaultForm: GalleryForm = {
  title: '',
  description: '',
  imageUrl: '',
};

export default function GaleriePage() {
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const crud = useAdminCrud<GalleryItem, GalleryForm>({
    endpoint: '/api/admin/gallery',
    defaultForm,
    getId: (item) => item.id,
    toForm: (item) => ({
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
    }),
    toPayload: (form) => form,
    sortCompare: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    messages: {
      load: 'Erreur lors du chargement de la galerie.',
      createSuccess: 'Photo ajoutée avec succès.',
      updateSuccess: 'Photo modifiée avec succès.',
      save: 'Erreur lors de l’enregistrement de la photo.',
      deleteSuccess: 'Photo supprimée avec succès.',
      delete: 'Erreur lors de la suppression de la photo.',
    },
  });

  const closeFormModal = () => {
    if (isUploadingImage) {
      return;
    }
    crud.closeFormModal();
  };

  const uploadImage = async (file: File) => {
    crud.setMessage('');
    setIsUploadingImage(true);

    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload-image',
      });
      crud.setForm((prev) => ({ ...prev, imageUrl: blob.url }));
    } catch {
      crud.setMessage('Erreur lors de l’upload de la photo.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const { openEditModal, openDeleteModal } = crud;

  const columns: ColumnDef<GalleryItem>[] = useMemo(
    () => [
      {
        accessorKey: 'imageUrl',
        header: 'Photo',
        cell: ({ row }) => (
          <Image
            src={row.original.imageUrl}
            alt={row.original.title}
            width={72}
            height={72}
            className="h-14 w-14 rounded-md border border-slate-200 object-cover"
          />
        ),
      },
      {
        accessorKey: 'title',
        header: 'Titre',
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => row.original.description || '-',
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
        <h1 className="text-3xl font-bold">Galerie</h1>
        <Button onClick={crud.openCreateModal}>Ajouter une photo</Button>
      </div>

      {crud.message && <p className="mb-4 text-sm text-slate-600">{crud.message}</p>}

      {crud.isLoading ? (
        <p>Chargement...</p>
      ) : (
        <DataTable columns={columns} data={crud.items} emptyMessage="Aucune photo enregistrée." />
      )}

      <AdminModal
        open={crud.isFormModalOpen}
        title={crud.isEditMode ? 'Modifier la photo' : 'Ajouter une photo'}
        onClose={closeFormModal}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={crud.save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={crud.form.title}
              onChange={(e) => crud.setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Titre de la photo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={crud.form.description}
              onChange={(e) =>
                crud.setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Description de la photo"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="image">Photo</Label>
            <Input
              id="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  uploadImage(file);
                }
              }}
            />
            {isUploadingImage && <p className="text-sm text-slate-600">Upload en cours...</p>}

            {crud.form.imageUrl && (
              <Image
                src={crud.form.imageUrl}
                alt="Aperçu photo"
                width={220}
                height={220}
                className="rounded-md border border-slate-200 object-cover"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeFormModal}
              disabled={crud.isSaving || isUploadingImage}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={crud.isSaving || isUploadingImage}>
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
          Voulez-vous vraiment supprimer la photo {crud.itemToDelete?.title ?? ''} ?
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
