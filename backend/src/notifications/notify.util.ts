import { NotificationPriority, NotificationType, Prisma, PrismaClient, Role } from '@prisma/client';

type Client = PrismaClient | Prisma.TransactionClient;

export type NotifyPayload = {
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  referenceType?: string;
  referenceId?: string;
};

export async function notifyUser(prisma: Client, userId: string, payload: NotifyPayload) {
  return prisma.notification.create({ data: { userId, ...payload } });
}

export async function notifyUsers(prisma: Client, userIds: string[], payload: NotifyPayload) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (!unique.length) return { count: 0 };
  return prisma.notification.createMany({ data: unique.map((userId) => ({ userId, ...payload })) });
}

export async function notifyRoles(prisma: Client, roles: Role[], payload: NotifyPayload, excludeUserId?: string) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, status: 'ACTIVE', ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });
  return notifyUsers(prisma, users.map((u) => u.id), payload);
}

export const MANAGEMENT_ROLES: Role[] = ['SUPERADMIN', 'MANAGER'];
