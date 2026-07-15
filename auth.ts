import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { dbConnect } from "@/lib/db/dbConnect";
import { User } from "@/models/User";
import { verifyPassword } from "@/lib/auth/password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        try {
          await dbConnect();
        } catch (error) {
          console.error("Auth: database connection failed", error);
          return null;
        }

        const user = await User.findOne({ email }).lean();
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } }).catch((error) => {
          console.error("Auth: failed to record lastLogin", error);
        });

        return {
          id: String(user._id),
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          await dbConnect();
          await User.findOneAndUpdate(
            { email: user.email },
            {
              $setOnInsert: {
                email: user.email,
                name: user.name,
                image: user.image,
                provider: "google",
              },
              $set: { lastLogin: new Date() },
            },
            { upsert: true }
          );
        } catch (error) {
          console.error("Auth: Google sign-in user upsert failed", error);
          return false;
        }
      }
      return true;
    },
  },
});
