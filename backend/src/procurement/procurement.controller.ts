import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto } from './dto/procurement.dto';
import { ProcurementService } from './procurement.service';

@Controller('procurement')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPERADMIN, Role.MANAGER)
export class ProcurementController {
  constructor(private readonly procurement: ProcurementService) {}

  @Get('context')
  context() {
    return this.procurement.context();
  }

  @Get('purchase-orders')
  list() {
    return this.procurement.list();
  }

  @Post('purchase-orders')
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.procurement.create(dto, user);
  }

  @Post('purchase-orders/:id/receive')
  receive(@Param('id') id: string, @Body() dto: ReceivePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.procurement.receive(id, dto, user);
  }

  @Post('purchase-orders/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.procurement.cancel(id, user);
  }
}
