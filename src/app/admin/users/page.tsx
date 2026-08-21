'use client';

import { AdminModal } from '@/components/admin/admin-modal';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminCrud } from '@/hooks/use-admin-crud';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

type UserRole = 'admin' | 'super-admin';

type UserRow = {
  id: string;
  firstName: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

type UserForm = {
  firstName: string;
  email: string;
  role: UserRole;
  password: string;
};

const defaultForm: UserForm = {
  firstName: '',
  email: '',
  role: 'admin',
  password: '',
};

function formatDate(dateValue: string) {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
  }).format(date);
}

export default function UsersPage() {
  const crud = useAdminCrud<UserRow, UserForm>({
    endpoint: '/api/admin/users',
    defaultForm,
    getId: (user) => user.id,
    toForm: (user) => ({
      firstName: user.firstName,
      email: user.email,
      role: user.role,
      password: '',
    }),
    toPayload: (form) => form,
    sortCompare: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    messages: {
      load: 'Erreur lors du chargement des utilisateurs.',
      createSuccess: 'Utilisateur ajouté avec succès.',
      updateSuccess: 'Utilisateur modifié avec succès.',
      deleteSuccess: 'Utilisateur supprimé avec succès.',
    },
  });

  const { openEditModal, openDeleteModal } = crud;

  const columns: ColumnDef<UserRow>[] = useMemo(
    () => [
      {
        accessorKey: 'firstName',
        header: 'Prénom',
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => <span className="lowercase">{row.original.email}</span>,
      },
      {
        accessorKey: 'role',
        header: 'Rôle',
        cell: ({ row }) => (
          <span className={`font-medium ${row.original.role === 'super-admin' ? 'text-purple-600' : 'text-blue-600'}`}>
            {row.original.role}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date de création',
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(row.original)}>
              Modifier
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => openDeleteModal(row.original)}>
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
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <Button onClick={crud.openCreateModal}>Ajouter un utilisateur</Button>
      </div>

      {crud.message && <p className="mb-4 text-sm text-slate-600">{crud.message}</p>}

      {crud.isLoading ? (
        <p>Chargement...</p>
      ) : (
        <DataTable columns={columns} data={crud.items} emptyMessage="Aucun utilisateur." />
      )}

      <AdminModal
        open={crud.isFormModalOpen}
        title={crud.isEditMode ? 'Modifier l’utilisateur' : 'Ajouter un utilisateur'}
        onClose={crud.closeFormModal}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={crud.save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom</Label>
            <Input
              id="firstName"
              value={crud.form.firstName}
              onChange={(e) => crud.setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={crud.form.email}
              onChange={(e) => crud.setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <select
              id="role"
              className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
              value={crud.form.role}
              onChange={(e) => crud.setForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
            >
              <option value="admin">admin</option>
              <option value="super-admin">super-admin</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {crud.isEditMode ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
            </Label>
            <Input
              id="password"
              type="password"
              value={crud.form.password}
              onChange={(e) => crud.setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder={crud.isEditMode ? 'Laisser vide pour ne pas changer' : ''}
              required={!crud.isEditMode}
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
          Voulez-vous vraiment supprimer l’utilisateur {crud.itemToDelete?.firstName ?? ''} ?
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
