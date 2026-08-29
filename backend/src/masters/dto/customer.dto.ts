import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';
export class CustomerDto {
 @IsString() code!:string; @IsString() name!:string; @IsOptional() @IsString() company?:string;
 @IsOptional() @IsString() contactPerson?:string; @IsOptional() @IsString() mobile?:string; @IsOptional() @IsEmail() email?:string;
 @IsOptional() @IsString() gst?:string; @IsOptional() @IsString() billingAddress?:string; @IsOptional() @IsString() shippingAddress?:string;
 @IsOptional() @IsString() state?:string; @IsOptional() @IsString() city?:string; @IsOptional() @IsNumber() creditLimit?:number;
 @IsOptional() @IsString() paymentTerms?:string; @IsOptional() @IsNumber() openingBalance?:number; @IsOptional() @IsBoolean() active?:boolean;
}
