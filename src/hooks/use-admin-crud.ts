'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

type Messages = {
  load?: string;
  createSuccess?: string;
  updateSuccess?: string;
  save?: string;
  deleteSuccess?: string;
  delete?: string;
};

type UseAdminCrudOptions<T, F> = {
  /** Endpoint REST de la ressource, ex. '/api/admin/concerts'. */
  endpoint: string;
  defaultForm: F;
  getId: (item: T) => string;
  /** Convertit un item de la liste vers l'état du formulaire d'édition. */
  toForm: (item: T) => F;
  /** Convertit l'état du formulaire vers le payload envoyé à l'API. */
  toPayload: (form: F) => unknown;
  /** Tri appliqué après chargement et après chaque création/modification. */
  sortCompare?: (a: T, b: T) => number;
  messages?: Messages;
};

async function extractErrorMessage(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || fallback;
}

/**
 * Regroupe l'état et les handlers communs à toutes les pages CRUD de
 * l'admin (liste, chargement, modals création/édition/suppression,
 * sauvegarde, suppression). Chaque page ne garde que ses champs de
 * formulaire et son rendu JSX.
 *
 * `openEditModal`/`openDeleteModal` (utilisés dans les colonnes de
 * DataTable) ont une identité stable d'un render à l'autre : les valeurs
 * les plus récentes des options sont lues via une ref plutôt que capturées
 * dans les dépendances, ce qui permet de mémoriser les `columns` avec
 * `useMemo` dans les pages qui utilisent ce hook.
 */
export function useAdminCrud<T, F>(options: UseAdminCrudOptions<T, F>) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<F>(options.defaultForm);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const isEditMode = editingId !== null;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(optionsRef.current.endpoint);
      if (!response.ok) {
        throw new Error('load failed');
      }

      const data = (await response.json()) as T[];
      const { sortCompare } = optionsRef.current;
      setItems(sortCompare ? [...data].sort(sortCompare) : data);
    } catch {
      setMessage(optionsRef.current.messages?.load ?? 'Erreur lors du chargement.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateModal = useCallback(() => {
    setForm(optionsRef.current.defaultForm);
    setEditingId(null);
    setIsFormModalOpen(true);
    setMessage('');
  }, []);

  const openEditModal = useCallback((item: T) => {
    setForm(optionsRef.current.toForm(item));
    setEditingId(optionsRef.current.getId(item));
    setIsFormModalOpen(true);
    setMessage('');
  }, []);

  const closeFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    setEditingId(null);
    setForm(optionsRef.current.defaultForm);
  }, []);

  const openDeleteModal = useCallback((item: T) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  }, []);

  const save = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setIsSaving(true);
      setMessage('');

      const { endpoint, toPayload, getId, sortCompare, messages } = optionsRef.current;
      const isEditing = editingId !== null;

      try {
        const response = await fetch(isEditing ? `${endpoint}/${editingId}` : endpoint, {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toPayload(form)),
        });

        if (!response.ok) {
          throw new Error(
            await extractErrorMessage(response, messages?.save ?? "Erreur lors de l'enregistrement.")
          );
        }

        // On fusionne directement l'élément renvoyé par l'API dans la liste
        // locale plutôt que de tout recharger (un GET complet en plus pour
        // une seule ligne modifiée).
        const saved = (await response.json()) as T;
        const savedId = getId(saved);

        setItems((prev) => {
          const next = [...prev.filter((item) => getId(item) !== savedId), saved];
          return sortCompare ? next.sort(sortCompare) : next;
        });

        setIsFormModalOpen(false);
        setEditingId(null);
        setForm(optionsRef.current.defaultForm);
        setMessage(
          isEditing ? (messages?.updateSuccess ?? 'Modifié avec succès.') : (messages?.createSuccess ?? 'Ajouté avec succès.')
        );
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : (optionsRef.current.messages?.save ?? "Erreur lors de l'enregistrement.")
        );
      } finally {
        setIsSaving(false);
      }
    },
    [editingId, form]
  );

  const remove = useCallback(async () => {
    if (!itemToDelete) {
      return;
    }

    setIsDeleting(true);
    setMessage('');

    const { endpoint, getId, messages } = optionsRef.current;
    const deleteId = getId(itemToDelete);

    try {
      const response = await fetch(`${endpoint}/${deleteId}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, messages?.delete ?? 'Erreur lors de la suppression.')
        );
      }

      // La suppression ne change jamais l'ordre des éléments restants :
      // filtrer localement est toujours correct, pas besoin de recharger.
      setItems((prev) => prev.filter((item) => getId(item) !== deleteId));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      setMessage(messages?.deleteSuccess ?? 'Supprimé avec succès.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : (optionsRef.current.messages?.delete ?? 'Erreur lors de la suppression.')
      );
    } finally {
      setIsDeleting(false);
    }
  }, [itemToDelete]);

  return {
    items,
    isLoading,
    isSaving,
    isDeleting,
    message,
    setMessage,
    isFormModalOpen,
    isEditMode,
    editingId,
    form,
    setForm,
    isDeleteModalOpen,
    itemToDelete,
    openCreateModal,
    openEditModal,
    closeFormModal,
    openDeleteModal,
    closeDeleteModal,
    save,
    remove,
    reload: load,
  };
}
