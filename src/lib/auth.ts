import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [Google],
  callbacks: {
    async signIn({ account, profile }) {
      return account?.provider === "google" && profile?.email_verified === true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase();
        const savedUser = await prisma.user.upsert({
          where: { email },
          update: { name: user.name ?? email },
          create: {
            email,
            name: user.name ?? email,
          },
          select: { id: true },
        });
        token.id = savedUser.id;
      } else if (user && typeof user.id === "string") {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
