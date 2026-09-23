import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/auth-user';
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController { constructor(private service:DashboardService){} @Get() get(@CurrentUser() user:AuthUser){ return this.service.get(user.id); } }
