import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import type { LicenseType, UserRole, StaffRole } from '@prisma/client';

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

/**
 * Throttle credential logins to blunt online password-guessing and
 * credential-stuffing. Two fail-closed buckets per 15-minute window:
 *   - per source IP (broad — one origin hammering many accounts)
 *   - per identifier (targeted — one account hammered from many origins)
 * Returns false when either bucket is exhausted; the caller then rejects with
 * the same generic failure as a wrong password, so it is not a login oracle.
 */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function loginClientIp(request?: Request): string {
  const forwarded = request?.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request?.headers.get('x-real-ip')?.trim() || 'unknown';
}

async function loginRateLimitOk(request: Request | undefined, identifier: string): Promise<boolean> {
  const ip = loginClientIp(request);
  const [ipOk, idOk] = await Promise.all([
    checkRateLimit(`login-ip:${ip}`, 20, LOGIN_WINDOW_MS, true),
    checkRateLimit(`login-id:${identifier.trim().toLowerCase()}`, 8, LOGIN_WINDOW_MS, true),
  ]);
  return ipOk && idOk;
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
      tenantId?: string | null;
      clinicalLicenseType?: LicenseType | null;
      clinicalLicenseNumber?: string | null;
      clinicalLicenseExpiry?: Date | string | null;
    };
  }
  interface User {
    role?: UserRole;
    patientId?: string | null;
    staffId?: string | null;
    staffRole?: StaffRole | null;
    phone?: string | null;
    tenantId?: string | null;
    clinicalLicenseType?: LicenseType | null;
    clinicalLicenseNumber?: string | null;
    clinicalLicenseExpiry?: Date | string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    // To change the timeout, edit `maxAge` (in seconds).
    maxAge: 60 * 45, // 45 minutes
    updateAge: 60 * 5, // refresh the session at most every 5 minutes
  },
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
      async authorize(credentials, request) {
        const identifier = credentials?.identifier as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!identifier || !password) return null;

        // Fail-closed brute-force / credential-stuffing throttle.
        if (!(await loginRateLimitOk(request, identifier))) return null;

        const user = await prisma.user.findFirst({
          where: {
            role: 'patient',
            OR: [
              { phone: identifier },
              { patient: { code: identifier } },
            ],
          },
          include: {
            patient: {
              select: {
                tenantId: true,
              },
            },
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
          tenantId: user.patient?.tenantId ?? 'platform',
          clinicalLicenseType: null,
          clinicalLicenseNumber: null,
          clinicalLicenseExpiry: null,
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
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Fail-closed brute-force / credential-stuffing throttle.
        if (!(await loginRateLimitOk(request, email))) return null;

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
          tenantId: staff.tenantId,
          clinicalLicenseType: staff.clinicalLicenseType,
          clinicalLicenseNumber: staff.clinicalLicenseNumber,
          clinicalLicenseExpiry: staff.clinicalLicenseExpiry,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider === 'google') {
        // Invite + claim posture: Google may only AUTHENTICATE an already
        // provisioned patient (a case created by intake, linked to a Patient).
        // It must never create a bare, unlinked account — those used to strand
        // the user on a dead-end "not linked" portal screen. Reject otherwise.
        const email = user?.email;
        if (!email) {
          return false;
        }
        const existing = await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true, patientId: true },
        });
        if (!existing || existing.role !== 'patient' || !existing.patientId) {
          // Denied → routed to the auth error page. No orphan account is created.
          return false;
        }
        await writeLoginAudit({
          actorId: existing.id,
          actorRole: 'patient',
          authProvider: 'google',
        });
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
        token.tenantId = user.tenantId;
        token.clinicalLicenseType = user.clinicalLicenseType;
        token.clinicalLicenseNumber = user.clinicalLicenseNumber;
        token.clinicalLicenseExpiry = user.clinicalLicenseExpiry;
      }
      // Re-read patientId after Google sign-in (may be freshly linked)
      if (account?.provider === 'google' && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: {
            role: true,
            patientId: true,
            patient: {
              select: {
                tenantId: true,
              },
            },
          },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.patientId = dbUser.patientId;
          token.tenantId = dbUser.patient?.tenantId ?? 'platform';
        }
      }
      // On session.update() call — refresh patientId/phone from DB
      if (trigger === 'update' && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: {
            role: true,
            patientId: true,
            staffId: true,
            phone: true,
            patient: {
              select: {
                tenantId: true,
              },
            },
            staff: {
              select: {
                role: true,
                tenantId: true,
                clinicalLicenseType: true,
                clinicalLicenseNumber: true,
                clinicalLicenseExpiry: true,
              },
            },
          },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.patientId = dbUser.patientId;
          token.staffId = dbUser.staffId;
          token.staffRole = dbUser.staff?.role ?? null;
          token.phone = dbUser.phone;
          token.tenantId = dbUser.staff?.tenantId ?? dbUser.patient?.tenantId ?? 'platform';
          token.clinicalLicenseType = dbUser.staff?.clinicalLicenseType ?? null;
          token.clinicalLicenseNumber = dbUser.staff?.clinicalLicenseNumber ?? null;
          token.clinicalLicenseExpiry = dbUser.staff?.clinicalLicenseExpiry ?? null;
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
      session.user.tenantId = (token.tenantId as string | null) ?? 'platform';
      session.user.clinicalLicenseType = (token.clinicalLicenseType as LicenseType | null) ?? null;
      session.user.clinicalLicenseNumber = (token.clinicalLicenseNumber as string | null) ?? null;
      session.user.clinicalLicenseExpiry = (token.clinicalLicenseExpiry as Date | string | null) ?? null;
      return session;
    },
  },

  pages: {
    signIn: '/en/auth/login',
    error: '/en/auth/error',
  },
});
