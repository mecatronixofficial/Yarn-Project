import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/auth-user';
import { FinanceService } from './finance.service';
import { CreateInvoiceDto, ExpenseDto, PaymentDto } from './dto/finance.dto';

@Controller('finance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPERADMIN, Role.MANAGER)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary') summary() { return this.finance.summary(); }
  @Get('context') context() { return this.finance.context(); }
  @Get('expenses') expenses() { return this.finance.expenses(); }
  @Post('expenses') addExpense(@Body() dto: ExpenseDto, @CurrentUser() user: AuthUser) { return this.finance.addExpense(dto, user.id); }
  @Get('invoices') invoices() { return this.finance.invoices(); }
  @Post('invoices') createInvoice(@Body() dto: CreateInvoiceDto) { return this.finance.createInvoice(dto); }
  @Get('payments') payments() { return this.finance.payments(); }
  @Post('payments') pay(@Body() dto: PaymentDto) { return this.finance.pay(dto); }
}
