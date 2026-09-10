'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, ChevronRight } from 'lucide-react';
import { Job } from '@/types/database';
import { deleteJobAction } from '@/lib/actions';
import { EditJobModal } from './EditJobModal';
import Link from 'next/link';
import { useState } from 'react';

interface JobRowActionsProps {
  job: Job;
}

export function JobRowActions({ job }: JobRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete job site "${job.site_name}" (${job.client})? All assignments will also be removed.`
      )
    )
      return;

    startTransition(async () => {
      try {
        await deleteJobAction(job.id);
        router.refresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Failed to delete job');
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center gap-1 font-bold text-[#6366f1] hover:text-indigo-800 transition-colors text-xs"
        >
          <span>View</span>
          <ChevronRight className="w-4 h-4" />
        </Link>

        <button
          onClick={() => setIsEditOpen(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors ml-1"
          title="Edit Job"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
          title="Delete Job"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <EditJobModal
        job={job}
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

/** Mobile card-level actions for jobs list */
export function JobCardActions({ job }: JobRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete job site "${job.site_name}" (${job.client})?`
      )
    )
      return;

    startTransition(async () => {
      try {
        await deleteJobAction(job.id);
        router.refresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Failed to delete job');
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 mt-3">
        <Link
          href={`/jobs/${job.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl py-1.5 hover:bg-indigo-100 transition-colors"
        >
          <span>Manage</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={() => setIsEditOpen(true)}
          className="flex-1 text-center text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl py-1.5 hover:bg-slate-100 transition-colors"
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

      <EditJobModal
        job={job}
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
