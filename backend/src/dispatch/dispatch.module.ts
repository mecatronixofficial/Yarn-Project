import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';

@Module({ imports: [InventoryModule, OrdersModule], controllers: [DispatchController], providers: [DispatchService] })
export class DispatchModule {}
