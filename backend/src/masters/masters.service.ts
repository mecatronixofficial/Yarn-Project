import { Injectable } from '@nestjs/common'; import { MachineStatus, MaintenanceType } from '@prisma/client'; import { PrismaService } from '../prisma/prisma.service'; import { CustomerDto } from './dto/customer.dto'; import { SupplierDto } from './dto/supplier.dto'; import { MachineDto } from './dto/machine.dto'; import { EmployeeDto } from './dto/employee.dto'; import { MANAGEMENT_ROLES, notifyRoles } from '../notifications/notify.util';
@Injectable() export class MastersService { constructor(private prisma:PrismaService){}
 customers(){return this.prisma.customer.findMany({where:{active:true},orderBy:{name:'asc'}})} createCustomer(d:CustomerDto){return this.prisma.customer.create({data:d as any})}
 updateCustomer(id:string,d:CustomerDto){return this.prisma.customer.update({where:{id},data:d as any})} deleteCustomer(id:string){return this.prisma.customer.update({where:{id},data:{active:false}})}
 suppliers(){return this.prisma.supplier.findMany({where:{active:true},orderBy:{name:'asc'}})} createSupplier(d:SupplierDto){return this.prisma.supplier.create({data:d as any})}
 updateSupplier(id:string,d:SupplierDto){return this.prisma.supplier.update({where:{id},data:d as any})} deleteSupplier(id:string){return this.prisma.supplier.update({where:{id},data:{active:false}})}
 machines(){return this.prisma.machine.findMany({where:{status:{not:MachineStatus.DISABLED}},include:{operator:true},orderBy:{code:'asc'}})}
 async createMachine(d:MachineDto){
  const created=await this.prisma.machine.create({data:d as any});
  if(this.isOutageStatus(created.status)) await this.openMaintenanceRecord(created.id,created.status);
  return created;
 }
 async updateMachine(id:string,d:MachineDto){
  const existing=await this.prisma.machine.findUnique({where:{id}});
  const updated=await this.prisma.machine.update({where:{id},data:d as any});
  if(existing && existing.status!==updated.status){
   if(this.isOutageStatus(updated.status)) await this.openMaintenanceRecord(id,updated.status);
   else if(this.isOutageStatus(existing.status)) await this.closeOpenMaintenanceRecord(id,'Resolved from Machines page');
  }
  return updated;
 }
 async deleteMachine(id:string){
  const existing=await this.prisma.machine.findUnique({where:{id}});
  const updated=await this.prisma.machine.update({where:{id},data:{status:MachineStatus.DISABLED}});
  if(existing && this.isOutageStatus(existing.status)) await this.closeOpenMaintenanceRecord(id,'Machine disabled');
  return updated;
 }
 private isOutageStatus(status:MachineStatus){return status===MachineStatus.MAINTENANCE||status===MachineStatus.BREAKDOWN}
 private async openMaintenanceRecord(machineId:string,status:MachineStatus){
  const isBreakdown=status===MachineStatus.BREAKDOWN;
  const machine=await this.prisma.machine.findUnique({where:{id:machineId}});
  const record=await this.prisma.maintenanceRecord.create({data:{
   machineId,
   type:isBreakdown?MaintenanceType.BREAKDOWN:MaintenanceType.PREVENTIVE,
   complaint:isBreakdown?'Breakdown reported from Machines page':'Preventive maintenance scheduled from Machines page',
   startedAt:new Date(),
  }});
  await notifyRoles(this.prisma,MANAGEMENT_ROLES,{
   title:isBreakdown?'Machine breakdown reported':'Machine sent for maintenance',
   message:`${machine?.code||machineId} • ${machine?.name||''}`,
   type:isBreakdown?'MACHINE_BREAKDOWN':'MAINTENANCE_DUE',
   priority:isBreakdown?'CRITICAL':'HIGH',
   referenceType:'Machine',
   referenceId:machineId,
  });
  return record;
 }
 private async closeOpenMaintenanceRecord(machineId:string,resolution:string){
  const open=await this.prisma.maintenanceRecord.findFirst({where:{machineId,endedAt:null},orderBy:{startedAt:'desc'}});
  if(open){
   await this.prisma.maintenanceRecord.update({where:{id:open.id},data:{endedAt:new Date(),resolution}});
   const machine=await this.prisma.machine.findUnique({where:{id:machineId}});
   await notifyRoles(this.prisma,MANAGEMENT_ROLES,{
    title:'Machine maintenance resolved',
    message:`${machine?.code||machineId} • ${resolution}`,
    type:'SYSTEM',
    referenceType:'Machine',
    referenceId:machineId,
   });
  }
 }
 async machineStats(){
  const grouped=await this.prisma.machine.groupBy({by:['status'],_count:{_all:true}});
  const count=(status:MachineStatus)=>grouped.find(g=>g.status===status)?._count._all||0;
  const total=grouped.reduce((sum,g)=>sum+g._count._all,0);
  return {
   total,
   running:count(MachineStatus.RUNNING),
   idle:count(MachineStatus.IDLE),
   maintenance:count(MachineStatus.MAINTENANCE),
   breakdown:count(MachineStatus.BREAKDOWN),
   disabled:count(MachineStatus.DISABLED),
  };
 }
 employees(){return this.prisma.employee.findMany({orderBy:{name:'asc'}})} createEmployee(d:EmployeeDto){return this.prisma.employee.create({data:d})}
 warehouses(){return this.prisma.warehouse.findMany({orderBy:{code:'asc'}})}
}
