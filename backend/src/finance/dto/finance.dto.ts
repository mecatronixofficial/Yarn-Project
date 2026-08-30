import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ExpenseDto {
  @IsString() category!: string;
  @IsOptional() @IsString() subcategory?: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) amount!: number;
  @IsString() paymentMode!: string;
  @IsOptional() @IsString() branch?: string;
}

export class CreateInvoiceDto {
  @IsString() customerId!: string;
  @IsString() salesOrderId!: string;
  @IsNumber() @Min(0) taxableValue!: number;
  @IsNumber() @Min(0) gstAmount!: number;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class PaymentDto {
  @IsString() customerId!: string;
  @IsOptional() @IsString() invoiceId?: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsString() mode!: string;
  @IsOptional() @IsString() referenceNo?: string;
  @IsOptional() @IsString() bank?: string;
  @IsOptional() @IsString() notes?: string;
}
