import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const proxy = NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*", "/builder/:path*"],
};
