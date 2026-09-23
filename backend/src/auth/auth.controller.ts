import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { notifyUser } from '../notifications/notify.util';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private config: ConfigService, private prisma: PrismaService) {}

  private cookieOptions(maxAge: number, refresh = false) {
    const prod = this.config.get('NODE_ENV') === 'production';
    const domain = this.config.get<string>('COOKIE_DOMAIN');
    return { httpOnly: true, secure: prod, sameSite: 'lax' as const, maxAge, path: refresh ? '/api/v1/auth' : '/', ...(domain ? { domain } : {}) };
  }

  private setTokens(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, this.cookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', refreshToken, this.cookieOptions(7 * 24 * 60 * 60 * 1000, true));
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateCredentials(dto);
    const tokens = await this.auth.issueSession(user, req.headers['user-agent'], req.ip);
    this.setTokens(res, tokens.accessToken, tokens.refreshToken);
    await notifyUser(this.prisma, user.id, {
      title: 'New login',
      message: `Signed in from ${req.ip || 'an unknown IP'}`,
      type: 'SYSTEM',
      priority: 'LOW',
      referenceType: 'User',
      referenceId: user.id,
    });
    return { success: true, message: 'Login successful', data: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token as string | undefined;
    const tokens = await this.auth.refresh(token ?? '', req.headers['user-agent'], req.ip);
    this.setTokens(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.revoke(req.cookies?.refresh_token);
    res.clearCookie('access_token', this.cookieOptions(0));
    res.clearCookie('refresh_token', this.cookieOptions(0, true));
    return { success: true, message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: AuthUser) { return { success: true, data: user }; }
}
