import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/auth-user';
import { DispatchService } from './dispatch.service';
import { CreateDeliveryDto, CreateDispatchDto, CreatePackingDto } from './dto/dispatch.dto';

@Controller('dispatch')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPERADMIN, Role.MANAGER)
export class DispatchController {
  constructor(private readonly dispatches: DispatchService) {}

  @Get() list() { return this.dispatches.list(); }
  @Get('context') context() { return this.dispatches.context(); }
  @Post('packing') pack(@Body() dto: CreatePackingDto) { return this.dispatches.pack(dto); }
  @Post() dispatch(@Body() dto: CreateDispatchDto, @CurrentUser() user: AuthUser) { return this.dispatches.dispatch(dto, user); }
  @Post(':id/in-transit') inTransit(@Param('id') id: string) { return this.dispatches.markInTransit(id); }
  @Post(':id/delivery') deliver(@Param('id') id: string, @Body() dto: CreateDeliveryDto, @CurrentUser() user: AuthUser) { return this.dispatches.deliver(id, dto, user); }
}
