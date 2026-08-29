import { IsOptional, IsString } from 'class-validator';
export class EmployeeDto { @IsString() code!:string; @IsString() name!:string; @IsString() department!:string; @IsOptional() @IsString() mobile?:string; @IsOptional() @IsString() shift?:string; }
