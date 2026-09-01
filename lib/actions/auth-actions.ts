"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db/dbConnect";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AuthActionState = { error?: string } | undefined;

/** Next's `redirect()` throws a special error to unwind the render tree — never treat it as a real failure. */
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const ip = await clientIp();
  const { allowed } = await checkRateLimit({ key: `signup:${ip}`, limit: 10, windowMs: 60 * 60 * 1000 });
  if (!allowed) return { error: "Too many attempts. Please wait a while and try again." };

  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password } = parsed.data;

  try {
    await dbConnect();
  } catch (error) {
    console.error("Sign-up: database connection failed", error);
    return { error: "We couldn't reach the server. Please try again in a moment." };
  }

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(password);
  try {
    await User.create({ name, email, passwordHash, provider: "credentials", lastLogin: new Date() });
  } catch (error) {
    // Handles the race where two sign-ups for the same email land between the findOne check and create.
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return { error: "An account with this email already exists" };
    }
    console.error("Sign-up: failed to create user", error);
    return { error: "Something went wrong creating your account. Please try again." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please log in." };
    }
    if (isRedirectError(error)) throw error;
    console.error("Sign-up: post-signup sign-in failed", error);
    return { error: "Account created, but sign-in failed. Please log in." };
  }

  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const ip = await clientIp();
  const { allowed } = await checkRateLimit({ key: `login:${ip}`, limit: 10, windowMs: 10 * 60 * 1000 });
  if (!allowed) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    return { error: "Enter your email and password" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    console.error("Login: unexpected sign-in failure", error);
    return { error: "Something went wrong signing you in. Please try again." };
  }

  redirect("/dashboard");
}
