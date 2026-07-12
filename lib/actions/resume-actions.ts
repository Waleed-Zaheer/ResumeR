"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/dbConnect";
import { Resume } from "@/models/Resume";
import { createEmptyResumeData, resumeDataSchema } from "@/lib/validations/resume";
import type { ResumeData } from "@/lib/types/resume";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createResumeAction(title?: string) {
  const userId = await requireUserId();
  await dbConnect();

  const resume = await Resume.create({
    userId,
    title: title?.trim() || "Untitled Resume",
    data: createEmptyResumeData(),
  });

  revalidatePath("/dashboard");
  redirect(`/builder/${resume._id}`);
}

export async function updateResumeAction(resumeId: string, data: ResumeData) {
  const userId = await requireUserId();
  await dbConnect();

  const parsed = resumeDataSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid resume data" };
  }

  const result = await Resume.findOneAndUpdate(
    { _id: resumeId, userId },
    { $set: { data: parsed.data, title: parsed.data.personalInfo.fullName || undefined } },
    { new: true }
  ).lean();

  if (!result) {
    return { ok: false as const, error: "Resume not found" };
  }

  return { ok: true as const };
}

export async function renameResumeAction(resumeId: string, title: string) {
  const userId = await requireUserId();
  await dbConnect();
  await Resume.findOneAndUpdate({ _id: resumeId, userId }, { $set: { title } });
  revalidatePath("/dashboard");
}

export async function deleteResumeAction(resumeId: string) {
  const userId = await requireUserId();
  await dbConnect();
  await Resume.deleteOne({ _id: resumeId, userId });
  revalidatePath("/dashboard");
}

export async function duplicateResumeAction(resumeId: string) {
  const userId = await requireUserId();
  await dbConnect();

  const original = await Resume.findOne({ _id: resumeId, userId }).lean();
  if (!original) throw new Error("Resume not found");

  await Resume.create({
    userId,
    title: `${original.title} (Copy)`,
    data: original.data,
  });

  revalidatePath("/dashboard");
}
