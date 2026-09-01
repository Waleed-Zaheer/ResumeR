"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Copy, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  deleteResumeEntry,
  duplicateResumeEntry,
  listResumes,
  renameResumeEntry,
  type ResumeListEntry,
} from "@/store/resume-list";
import { topLoader } from "@/lib/top-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { NewResumeButton } from "@/components/dashboard/new-resume-button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ResumeDashboard({ userName }: { userName?: string | null }) {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeListEntry[] | null>(null);
  const [renaming, setRenaming] = useState<ResumeListEntry | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<ResumeListEntry | null>(null);

  useEffect(() => {
    setResumes(listResumes());
  }, []);

  function refresh() {
    setResumes(listResumes());
  }

  function openResume(id: string) {
    topLoader.start();
    router.push(`/builder?id=${id}`);
  }

  function handleDuplicate(id: string) {
    duplicateResumeEntry(id);
    refresh();
  }

  function confirmRename() {
    if (!renaming) return;
    const name = renameValue.trim();
    if (name) renameResumeEntry(renaming.id, name);
    setRenaming(null);
    refresh();
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteResumeEntry(deleting.id);
    setDeleting(null);
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-lg font-medium">
            Welcome{userName ? `, ${userName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your resumes are saved in this browser only — we don&apos;t store your CV content on
            our servers.
          </p>
        </div>
        {resumes && resumes.length > 0 && <NewResumeButton />}
      </div>

      {resumes === null ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : resumes.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No resumes yet</EmptyTitle>
            <EmptyDescription>
              Start from a blank resume, or duplicate one later to tailor it for a specific role.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewResumeButton />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <Card key={resume.id} size="sm">
              <CardContent className="flex items-center gap-3">
                <Link href={`/builder?id=${resume.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <FileText className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{resume.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Edited {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
                <Button variant="outline" size="sm" onClick={() => openResume(resume.id)}>
                  Open
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${resume.name}`}>
                        <MoreHorizontal />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameValue(resume.name);
                        setRenaming(resume);
                      }}
                    >
                      <Pencil />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(resume.id)}>
                      <Copy />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(resume)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename resume</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="resume-name" className="sr-only">
              Resume name
            </Label>
            <Input
              id="resume-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleting?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone — the resume's content will be permanently removed from this browser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
