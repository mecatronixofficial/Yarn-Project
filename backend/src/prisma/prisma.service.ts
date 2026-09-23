import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const DEFAULT_CONNECTION_LIMIT = 5;
const DEFAULT_POOL_TIMEOUT_SECONDS = 30;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function appendParameter(url: string, name: string, value: number) {
  if (new RegExp(`[?&]${name}=`).test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${name}=${value}`;
}

function prismaClientOptions(): Prisma.PrismaClientOptions {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return {};

  // The hosted PostgreSQL plan has fewer usable connection slots than
  // Prisma's CPU-derived default pool size. Keep headroom for migrations and
  // administration, and let short traffic bursts wait instead of failing.
  const connectionLimit = positiveInteger(
    process.env.DATABASE_CONNECTION_LIMIT,
    DEFAULT_CONNECTION_LIMIT,
  );
  const poolTimeout = positiveInteger(
    process.env.DATABASE_POOL_TIMEOUT,
    DEFAULT_POOL_TIMEOUT_SECONDS,
  );

  const withConnectionLimit = appendParameter(
    databaseUrl,
    'connection_limit',
    connectionLimit,
  );
  return {
    datasourceUrl: appendParameter(
      withConnectionLimit,
      'pool_timeout',
      poolTimeout,
    ),
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super(prismaClientOptions());
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
