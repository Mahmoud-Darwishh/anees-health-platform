import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import type { UserRole, StaffRole } from '@prisma/client';

async function writeLoginAudit(params: {
  actorId: string;
  actorRole: UserRole;
  authProvider: 'patient-credentials' | 'staff-credentials' | 'google';
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tableName: params.actorRole === 'staff' ? 'staff' : 'users',
        recordId: params.actorId,
        action: 'login',
        changedFields: {
          provider: params.authProvider,
        },
        changedBy: `${params.actorRole}_${params.actorId}`,
      },
    });
  } catch {
    // Best-effort only; failed login audit should not block auth flow.
  }
}

// Augment next-auth Session so session.user carries our custom fields
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      patientId?: string | null;
      staffId?: string | null;
      staffRole?: StaffRole | null;
      phone?: string | null;
    };
  }
  interface User {
    role?: UserRole;
    patientId?: string | null;
    staffId?: string | null;
    staffRole?: StaffRole | null;
    phone?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  trustHost: true,

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),

    Credentials({
      id: 'patient-credentials',
      name: 'Patient Login',
      credentials: {
        identifier: { label: 'Phone or Case ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!identifier || !password) return null;

        const user = await prisma.user.findFirst({
          where: {
            role: 'patient',
            OR: [
              { phone: identifier },
              { patient: { code: identifier } },
            ],
          },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await writeLoginAudit({
          actorId: user.id,
          actorRole: 'patient',
          authProvider: 'patient-credentials',
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          phone: user.phone,
          patientId: user.patientId,
          staffId: null,
          staffRole: null,
        };
      },
    }),

    Credentials({
      id: 'staff-credentials',
      name: 'Staff Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const staff = await prisma.staff.findUnique({ where: { email } });
        if (!staff || staff.status !== 'active' || !staff.passwordHash) return null;

        const valid = await bcrypt.compare(password, staff.passwordHash);
        if (!valid) return null;

        // TODO(audit): wire when auth lands — staff login event
        await prisma.staff.update({
          where: { id: staff.id },
          data: { lastLoginAt: new Date() },
        });

        await writeLoginAudit({
          actorId: staff.id,
          actorRole: 'staff',
          authProvider: 'staff-credentials',
        });

        return {
          id: `staff_${staff.id}`,
          name: staff.name,
          email: staff.email,
          image: null,
          role: 'staff' as UserRole,
          phone: null,
          patientId: null,
          staffId: staff.id,
          staffRole: staff.role,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider === 'google') {
        // Default role is already 'patient' via the DB model default
        if (user?.id) {
          await writeLoginAudit({
            actorId: user.id,
            actorRole: (user.role as UserRole | undefined) ?? 'patient',
            authProvider: 'google',
          });
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.role = user.role;
        token.patientId = user.patientId;
        token.staffId = user.staffId;
        token.staffRole = user.staffRole;
        token.phone = user.phone;
      }
      // Re-read patientId after Google sign-in (may be freshly linked)
      if (account?.provider === 'google' && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { role: true, patientId: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.patientId = dbUser.patientId;
        }
      }
      // On session.update() call — refresh patientId/phone from DB
      if (trigger === 'update' && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { role: true, patientId: true, phone: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.patientId = dbUser.patientId;
          token.phone = dbUser.phone;
        }
      }
      return token;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      session.user.id = (token.sub as string) ?? '';
      session.user.role = (token.role as UserRole) ?? 'patient';
      session.user.patientId = (token.patientId as string | null) ?? null;
      session.user.staffId = (token.staffId as string | null) ?? null;
      session.user.staffRole = (token.staffRole as StaffRole | null) ?? null;
      session.user.phone = (token.phone as string | null) ?? null;
      return session;
    },
  },

  pages: {
    signIn: '/en/auth/login',
    error: '/en/auth/error',
  },
});
