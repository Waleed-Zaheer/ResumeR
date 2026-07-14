"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "@/components/ui/sonner";
import { deleteResumeAction } from "@/lib/actions/resume-actions";
import { ResumeCard } from "@/components/dashboard/resume-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TemplateId } from "@/lib/types/resume";

export interface ResumeListItem {
  id: string;
  title: string;
  templateId: TemplateId;
  fullName: string;
  jobTitle: string;
  updatedAt: string;
}

export function ResumeGrid({ resumes }: { resumes: ResumeListItem[] }) {
  const [optimisticResumes, removeOptimistic] = useOptimistic(
    resumes,
    (state, deletedId: string) => state.filter((resume) => resume.id !== deletedId)
  );
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequestDelete(id: string, label: string) {
    setDeleteTarget({ id, label });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    startTransition(async () => {
      removeOptimistic(target.id);
      try {
        await deleteResumeAction(target.id);
        toast.success("Resume deleted");
      } catch {
        toast.error("Failed to delete resume. Please try again.");
      }
    });
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {optimisticResumes.map((resume) => (
          <ResumeCard key={resume.id} resume={resume} onRequestDelete={handleRequestDelete} />
        ))}
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete resume?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.label}" will be permanently deleted. This can't be undone.`
                : "This can't be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
