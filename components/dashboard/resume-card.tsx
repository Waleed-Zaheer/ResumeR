"use client";

import { useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "@/components/ui/sonner";
import { MoreVertical, Pencil, Copy, Download, Trash2 } from "lucide-react";
import { duplicateResumeAction } from "@/lib/actions/resume-actions";
import { templateConfigs } from "@/components/resume/templates/shared/template-config";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ResumeListItem } from "@/components/dashboard/resume-grid";

export function ResumeCard({
  resume,
  onRequestDelete,
}: {
  resume: ResumeListItem;
  onRequestDelete: (id: string, label: string) => void;
}) {
  const [isDuplicating, startDuplicateTransition] = useTransition();

  const displayTitle = resume.title.trim() || resume.fullName.trim() || "Untitled Resume";
  const templateLabel = templateConfigs[resume.templateId]?.label ?? resume.templateId;
  let updatedLabel = "recently";
  try {
    updatedLabel = format(new Date(resume.updatedAt), "MMM d, yyyy");
  } catch {
    // keep fallback
  }

  function handleDuplicate() {
    startDuplicateTransition(async () => {
      try {
        await duplicateResumeAction(resume.id);
        toast.success("Resume duplicated");
      } catch {
        toast.error("Failed to duplicate resume. Please try again.");
      }
    });
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="truncate">{displayTitle}</CardTitle>
        <CardDescription className="truncate">
          {resume.jobTitle.trim() || "No job title set"}
        </CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreVertical className="size-4" />
              <span className="sr-only">Open resume actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/builder/${resume.id}`} />}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isDuplicating} onClick={handleDuplicate}>
                <Copy />
                {isDuplicating ? "Duplicating..." : "Duplicate"}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<a href={`/api/resumes/${resume.id}/export/pdf`} download />}
              >
                <Download />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRequestDelete(resume.id, displayTitle)}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex items-center justify-between gap-2 border-t-0 bg-transparent">
        <Badge variant="outline">{templateLabel}</Badge>
        <span className="text-xs text-muted-foreground">Updated {updatedLabel}</span>
      </CardFooter>
    </Card>
  );
}
