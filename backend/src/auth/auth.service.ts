import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {}

  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }

  async validateCredentials(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || user.status !== 'ACTIVE' || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }

  async issueSession(user: { id: string; email: string; name: string; role: any }, userAgent?: string, ipAddress?: string) {
    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: this.config.get('ACCESS_TOKEN_EXPIRES', '15m') as any,
    });
    const sid = randomUUID();
    const refreshToken = await this.jwt.signAsync({ ...payload, sid }, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: this.config.get('REFRESH_TOKEN_EXPIRES', '7d') as any,
    });
    const decoded = this.jwt.decode(refreshToken) as { exp: number };
    await this.prisma.refreshSession.create({ data: {
      id: sid, userId: user.id, tokenHash: this.hashToken(refreshToken), userAgent, ipAddress, expiresAt: new Date(decoded.exp * 1000),
    }});
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string, userAgent?: string, ipAddress?: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid: string }>(refreshToken, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') });
      const session = await this.prisma.refreshSession.findUnique({ where: { id: payload.sid }, include: { user: true } });
      if (!session || session.revokedAt || session.expiresAt < new Date() || session.tokenHash !== this.hashToken(refreshToken)) throw new Error('bad session');
      await this.prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      return this.issueSession(session.user, userAgent, ipAddress);
    } catch { throw new UnauthorizedException('Refresh session expired'); }
  }

  async revoke(refreshToken?: string) {
    if (!refreshToken) return;
    const decoded = this.jwt.decode(refreshToken) as { sid?: string } | null;
    if (decoded?.sid) await this.prisma.refreshSession.updateMany({ where: { id: decoded.sid }, data: { revokedAt: new Date() } });
  }

  async revokeAll(userId: string) {
    await this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
