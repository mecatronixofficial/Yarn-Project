import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrderLifecycleService } from './order-lifecycle.service';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderLifecycleService],
  exports: [OrderLifecycleService],
})
export class OrdersModule {}
