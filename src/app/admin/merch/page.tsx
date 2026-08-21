'use client';

import { AdminModal } from '@/components/admin/admin-modal';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminCrud } from '@/hooks/use-admin-crud';
import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { useMemo, useState } from 'react';

type Merch = {
  id: string;
  title: string;
  price: number;
  sizes: string[];
  images: string[];
  createdAt: string;
};

type MerchForm = {
  title: string;
  price: string;
  sizes: string[];
  images: string[];
};

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const defaultForm: MerchForm = {
  title: '',
  price: '',
  sizes: [],
  images: [],
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

async function uploadOneImage(file: File) {
  const data = new FormData();
  data.append('file', file);

  const response = await fetch('/api/admin/upload-image', {
    method: 'POST',
    body: data,
  });

  if (!response.ok) {
    throw new Error('Upload impossible');
  }

  const payload = (await response.json()) as { url: string };
  return payload.url;
}

export default function MerchPage() {
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const crud = useAdminCrud<Merch, MerchForm>({
    endpoint: '/api/admin/merch',
    defaultForm,
    getId: (item) => item.id,
    toForm: (item) => ({
      title: item.title,
      price: String(item.price),
      sizes: item.sizes ?? [],
      images: item.images ?? [],
    }),
    toPayload: (form) => ({
      title: form.title,
      price: Number(form.price),
      sizes: form.sizes,
      images: form.images,
    }),
    sortCompare: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    messages: {
      load: 'Erreur lors du chargement du merch.',
      createSuccess: 'Article ajouté avec succès.',
      updateSuccess: 'Article modifié avec succès.',
      save: 'Erreur lors de l’enregistrement de l’article.',
      deleteSuccess: 'Article supprimé avec succès.',
      delete: 'Erreur lors de la suppression de l’article.',
    },
  });

  const closeFormModal = () => {
    if (isUploadingImages) {
      return;
    }
    crud.closeFormModal();
  };

  const toggleSize = (size: string) => {
    crud.setForm((prev) => {
      const hasSize = prev.sizes.includes(size);
      return {
        ...prev,
        sizes: hasSize ? prev.sizes.filter((item) => item !== size) : [...prev.sizes, size],
      };
    });
  };

  const uploadImages = async (files: FileList) => {
    crud.setMessage('');
    setIsUploadingImages(true);

    try {
      // Les uploads sont indépendants les uns des autres : on les
      // parallélise plutôt que de les attendre un par un.
      const uploadedUrls = await Promise.all(Array.from(files).map(uploadOneImage));
      crud.setForm((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
    } catch {
      crud.setMessage('Erreur lors de l’upload des images.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeImage = (imageUrl: string) => {
    crud.setForm((prev) => ({
      ...prev,
      images: prev.images.filter((url) => url !== imageUrl),
    }));
  };

  const { openEditModal, openDeleteModal } = crud;

  const columns: ColumnDef<Merch>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Titre',
      },
      {
        accessorKey: 'price',
        header: 'Prix',
        cell: ({ row }) => formatPrice(row.original.price),
      },
      {
        accessorKey: 'sizes',
        header: 'Tailles',
        cell: ({ row }) => (row.original.sizes.length > 0 ? row.original.sizes.join(', ') : '-'),
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
        <h1 className="text-3xl font-bold">Merch</h1>
        <Button onClick={crud.openCreateModal}>Ajouter un article</Button>
      </div>

      {crud.message && <p className="mb-4 text-sm text-slate-600">{crud.message}</p>}

      {crud.isLoading ? (
        <p>Chargement...</p>
      ) : (
        <DataTable columns={columns} data={crud.items} emptyMessage="Aucun article enregistré." />
      )}

      <AdminModal
        open={crud.isFormModalOpen}
        title={crud.isEditMode ? 'Modifier l’article' : 'Ajouter un article'}
        onClose={closeFormModal}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={crud.save} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={crud.form.title}
                onChange={(e) => crud.setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Nom de l’article"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prix</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={crud.form.price}
                onChange={(e) => crud.setForm((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tailles disponibles</Label>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              {AVAILABLE_SIZES.map((size) => (
                <label
                  key={size}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={crud.form.sizes.includes(size)}
                    onChange={() => toggleSize(size)}
                  />
                  <span>{size}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="images">Images</Label>
            <Input
              id="images"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  uploadImages(e.target.files);
                }
              }}
            />
            {isUploadingImages && <p className="text-sm text-slate-600">Upload en cours...</p>}

            {crud.form.images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {crud.form.images.map((imageUrl) => (
                  <div key={imageUrl} className="space-y-2">
                    <Image
                      src={imageUrl}
                      alt="Image article"
                      width={160}
                      height={160}
                      className="h-28 w-full rounded-md border border-slate-200 object-cover"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => removeImage(imageUrl)}
                    >
                      Retirer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeFormModal}
              disabled={crud.isSaving || isUploadingImages}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={crud.isSaving || isUploadingImages}>
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
          Voulez-vous vraiment supprimer l’article {crud.itemToDelete?.title ?? ''} ?
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
