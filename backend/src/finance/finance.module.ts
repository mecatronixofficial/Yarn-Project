import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({ imports: [OrdersModule], controllers: [FinanceController], providers: [FinanceService] })
export class FinanceModule {}
