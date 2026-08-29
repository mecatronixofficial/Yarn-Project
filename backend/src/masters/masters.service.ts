import { Injectable } from '@nestjs/common'; import { PrismaService } from '../prisma/prisma.service'; import { CustomerDto } from './dto/customer.dto'; import { SupplierDto } from './dto/supplier.dto'; import { MachineDto } from './dto/machine.dto'; import { EmployeeDto } from './dto/employee.dto';
@Injectable() export class MastersService { constructor(private prisma:PrismaService){}
 customers(){return this.prisma.customer.findMany({orderBy:{name:'asc'}})} createCustomer(d:CustomerDto){return this.prisma.customer.create({data:d as any})}
 suppliers(){return this.prisma.supplier.findMany({orderBy:{name:'asc'}})} createSupplier(d:SupplierDto){return this.prisma.supplier.create({data:d as any})}
 machines(){return this.prisma.machine.findMany({include:{operator:true},orderBy:{code:'asc'}})} createMachine(d:MachineDto){return this.prisma.machine.create({data:d as any})}
 employees(){return this.prisma.employee.findMany({orderBy:{name:'asc'}})} createEmployee(d:EmployeeDto){return this.prisma.employee.create({data:d})}
 warehouses(){return this.prisma.warehouse.findMany({orderBy:{code:'asc'}})}
}
