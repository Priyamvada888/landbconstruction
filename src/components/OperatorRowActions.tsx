'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import { Operator, UserRole } from '@/types/database';
import { deleteOperatorAction } from '@/lib/actions';
import { EditOperatorModal } from './EditOperatorModal';
import Link from 'next/link';
import { useState } from 'react';

interface OperatorRowActionsProps {
  operator: Operator;
  currentRole: UserRole;
}

export function OperatorRowActions({ operator, currentRole }: OperatorRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${operator.name}"? This will also remove their job assignments.`
      )
    )
      return;

    startTransition(async () => {
      try {
        await deleteOperatorAction(operator.id);
        router.refresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Failed to delete operator');
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link
          href={`/operators/${operator.id}`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="View Profile"
        >
          <MoreVertical className="w-4 h-4" />
        </Link>

        <button
          onClick={() => setIsEditOpen(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="Edit Operator"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
          title="Delete Operator"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <EditOperatorModal
        operator={operator}
        currentRole={currentRole}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          setIsEditOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

/** Mobile card-level actions (shown below the card info) */
export function OperatorCardActions({ operator, currentRole }: OperatorRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${operator.name}"? This will also remove their job assignments.`
      )
    )
      return;

    startTransition(async () => {
      try {
        await deleteOperatorAction(operator.id);
        router.refresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Failed to delete operator');
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 mt-3">
        <Link
          href={`/operators/${operator.id}`}
          className="flex-1 text-center text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl py-1.5 hover:bg-slate-100 transition-colors"
        >
          View
        </Link>
        <button
          onClick={() => setIsEditOpen(true)}
          className="flex-1 text-center text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl py-1.5 hover:bg-indigo-100 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="px-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl py-1.5 hover:bg-rose-100 transition-colors disabled:opacity-40"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <EditOperatorModal
        operator={operator}
        currentRole={currentRole}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          setIsEditOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
