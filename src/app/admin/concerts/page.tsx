'use client';

import { AdminModal } from '@/components/admin/admin-modal';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminCrud } from '@/hooks/use-admin-crud';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

type Concert = {
  id: string;
  date: string;
  venue: string;
  description: string;
  link: string;
};

type ConcertForm = {
  date: string;
  venue: string;
  description: string;
  link: string;
};

const defaultForm: ConcertForm = {
  date: '',
  venue: '',
  description: '',
  link: '',
};

function toInputDateTime(isoDate: string) {
  if (!isoDate) {
    return '';
  }
  const date = new Date(isoDate);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoDate(inputDate: string) {
  if (!inputDate) {
    return '';
  }
  return new Date(inputDate).toISOString();
}

function formatDisplayDate(dateValue: string) {
  if (!dateValue) {
    return '-';
  }

  const date = new Date(dateValue);
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function ConcertsPage() {
  const crud = useAdminCrud<Concert, ConcertForm>({
    endpoint: '/api/admin/concerts',
    defaultForm,
    getId: (concert) => concert.id,
    toForm: (concert) => ({
      date: toInputDateTime(concert.date),
      venue: concert.venue,
      description: concert.description,
      link: concert.link,
    }),
    toPayload: (form) => ({ ...form, date: toIsoDate(form.date) }),
    sortCompare: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    messages: {
      load: 'Erreur lors du chargement des concerts.',
      createSuccess: 'Concert ajouté avec succès.',
      updateSuccess: 'Concert modifié avec succès.',
      save: 'Erreur lors de l’enregistrement du concert.',
      deleteSuccess: 'Concert supprimé avec succès.',
      delete: 'Erreur lors de la suppression du concert.',
    },
  });

  const { openEditModal, openDeleteModal } = crud;

  const columns: ColumnDef<Concert>[] = useMemo(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => formatDisplayDate(row.original.date),
      },
      {
        accessorKey: 'venue',
        header: 'Lieu',
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
        <h1 className="text-3xl font-bold">Concerts</h1>
        <Button onClick={crud.openCreateModal}>Ajouter un concert</Button>
      </div>

      {crud.message && <p className="mb-4 text-sm text-slate-600">{crud.message}</p>}

      {crud.isLoading ? (
        <p>Chargement...</p>
      ) : (
        <DataTable columns={columns} data={crud.items} emptyMessage="Aucun concert enregistré." />
      )}

      <AdminModal
        open={crud.isFormModalOpen}
        title={crud.isEditMode ? 'Modifier le concert' : 'Ajouter un concert'}
        onClose={crud.closeFormModal}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={crud.save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="datetime-local"
              value={crud.form.date}
              onChange={(e) => crud.setForm((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Lieu</Label>
            <Input
              id="venue"
              value={crud.form.venue}
              onChange={(e) => crud.setForm((prev) => ({ ...prev, venue: e.target.value }))}
              placeholder="Nom de la salle, ville..."
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
              placeholder="Infos sur le concert"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">Lien (billetterie ou autre)</Label>
            <Input
              id="link"
              value={crud.form.link}
              onChange={(e) => crud.setForm((prev) => ({ ...prev, link: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={crud.closeFormModal} disabled={crud.isSaving}>
              Annuler
            </Button>
            <Button type="submit" disabled={crud.isSaving}>
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
          Voulez-vous vraiment supprimer ce concert du {formatDisplayDate(crud.itemToDelete?.date ?? '')} ?
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
