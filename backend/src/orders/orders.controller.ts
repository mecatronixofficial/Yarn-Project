import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto, CreateProductionOrderDto, UpdateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPERADMIN, Role.MANAGER)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get() list() { return this.orders.list(); }
  @Post() create(@Body() dto: CreateOrderDto) { return this.orders.create(dto); }
  @Get(':id') get(@Param('id') id: string) { return this.orders.get(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateOrderDto) { return this.orders.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.orders.remove(id); }
  @Post(':id/confirm') confirm(@Param('id') id: string) { return this.orders.confirm(id); }
  @Post(':id/cancel') cancel(@Param('id') id: string) { return this.orders.cancel(id); }
  @Post(':id/close') close(@Param('id') id: string) { return this.orders.close(id); }
  @Post(':id/production-orders') production(@Param('id') id: string, @Body() dto: CreateProductionOrderDto) { return this.orders.createProductionOrder(id, dto); }
  @Get(':id/traceability') trace(@Param('id') id: string) { return this.orders.trace(id); }
}
