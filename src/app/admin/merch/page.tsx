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
  image1: string;
  image2: string;
};

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const defaultForm: MerchForm = {
  title: '',
  price: '',
  sizes: [],
  image1: '',
  image2: '',
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

async function uploadOneImage(file: File) {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/admin/upload-image',
  });
  return blob.url;
}

export default function MerchPage() {
  const [isUploadingImage1, setIsUploadingImage1] = useState(false);
  const [isUploadingImage2, setIsUploadingImage2] = useState(false);
  const isUploadingImages = isUploadingImage1 || isUploadingImage2;

  const crud = useAdminCrud<Merch, MerchForm>({
    endpoint: '/api/admin/merch',
    defaultForm,
    getId: (item) => item.id,
    toForm: (item) => ({
      title: item.title,
      price: String(item.price),
      sizes: item.sizes ?? [],
      image1: item.images?.[0] ?? '',
      image2: item.images?.[1] ?? '',
    }),
    toPayload: (form) => ({
      title: form.title,
      price: Number(form.price),
      sizes: form.sizes,
      images: [form.image1, form.image2].filter(Boolean),
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

  const uploadImageToSlot = async (slot: 1 | 2, file: File) => {
    crud.setMessage('');
    const setUploading = slot === 1 ? setIsUploadingImage1 : setIsUploadingImage2;
    const field = slot === 1 ? 'image1' : 'image2';
    setUploading(true);

    try {
      const url = await uploadOneImage(file);
      crud.setForm((prev) => ({ ...prev, [field]: url }));
    } catch {
      crud.setMessage('Erreur lors de l’upload de l’image.');
    } finally {
      setUploading(false);
    }
  };

  const removeImageFromSlot = (slot: 1 | 2) => {
    const field = slot === 1 ? 'image1' : 'image2';
    crud.setForm((prev) => ({ ...prev, [field]: '' }));
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="image1">Photo 1 (par défaut)</Label>
              <Input
                id="image1"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadImageToSlot(1, file);
                  }
                }}
              />
              {isUploadingImage1 && <p className="text-sm text-slate-600">Upload en cours...</p>}

              {crud.form.image1 && (
                <div className="space-y-2">
                  <Image
                    src={crud.form.image1}
                    alt="Photo 1 de l’article"
                    width={160}
                    height={160}
                    className="h-28 w-full rounded-md border border-slate-200 object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => removeImageFromSlot(1)}
                  >
                    Retirer
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="image2">Photo 2 (au survol)</Label>
              <p className="text-sm text-slate-600">Optionnelle. Affichée au survol de la carte sur le site.</p>
              <Input
                id="image2"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadImageToSlot(2, file);
                  }
                }}
              />
              {isUploadingImage2 && <p className="text-sm text-slate-600">Upload en cours...</p>}

              {crud.form.image2 && (
                <div className="space-y-2">
                  <Image
                    src={crud.form.image2}
                    alt="Photo 2 de l’article"
                    width={160}
                    height={160}
                    className="h-28 w-full rounded-md border border-slate-200 object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => removeImageFromSlot(2)}
                  >
                    Retirer
                  </Button>
                </div>
              )}
            </div>
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
