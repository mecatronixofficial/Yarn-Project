import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport'; import { MachineStatus, MaintenanceType, Role } from '@prisma/client'; import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'; import { Roles } from '../common/decorators/roles.decorator'; import { RolesGuard } from '../common/guards/roles.guard'; import { PrismaService } from '../prisma/prisma.service'; import { MANAGEMENT_ROLES, notifyRoles } from '../notifications/notify.util';
class MaintenanceDto { @IsString() machineId!:string; @IsString() complaint!:string; @IsOptional() @IsEnum(MaintenanceType) type?:MaintenanceType; @IsOptional() @IsString() technician?:string; @IsOptional() @IsString() spareParts?:string; @IsOptional() @IsNumber() cost?:number; @IsDateString() startedAt!:string; }
class EditMaintenanceDto { @IsOptional() @IsString() complaint?:string; @IsOptional() @IsEnum(MaintenanceType) type?:MaintenanceType; @IsOptional() @IsString() technician?:string; @IsOptional() @IsString() spareParts?:string; @IsOptional() @IsNumber() cost?:number; @IsOptional() @IsDateString() startedAt?:string; @IsOptional() @IsDateString() endedAt?:string; @IsOptional() @IsEnum(MachineStatus) machineStatus?:MachineStatus; }
@Controller('operations') @UseGuards(AuthGuard('jwt'),RolesGuard) @Roles(Role.SUPERADMIN,Role.MANAGER) export class OperationsController {constructor(private prisma:PrismaService){}
 @Get('maintenance') list(){return this.prisma.maintenanceRecord.findMany({include:{machine:true},orderBy:{startedAt:'desc'}})}
 @Post('maintenance') async create(@Body() d:MaintenanceDto){
  const machine=await this.prisma.machine.update({where:{id:d.machineId},data:{status:d.type===MaintenanceType.BREAKDOWN?'BREAKDOWN':'MAINTENANCE'}});
  const record=await this.prisma.maintenanceRecord.create({data:{machineId:d.machineId,complaint:d.complaint,type:d.type,technician:d.technician,spareParts:d.spareParts,cost:d.cost,startedAt:new Date(d.startedAt)}});
  const isBreakdown=d.type===MaintenanceType.BREAKDOWN;
  await notifyRoles(this.prisma,MANAGEMENT_ROLES,{
   title:isBreakdown?'Machine breakdown reported':'Machine sent for maintenance',
   message:`${machine.code} • ${d.complaint}`,
   type:isBreakdown?'MACHINE_BREAKDOWN':'MAINTENANCE_DUE',
   priority:isBreakdown?'CRITICAL':'HIGH',
   referenceType:'MaintenanceRecord',
   referenceId:record.id,
  });
  return record;
 }
 @Patch('maintenance/:id') async update(@Param('id') id:string,@Body() d:EditMaintenanceDto){
  const updated=await this.prisma.maintenanceRecord.update({where:{id},data:{
   ...(d.complaint!==undefined&&{complaint:d.complaint}),
   ...(d.type!==undefined&&{type:d.type}),
   ...(d.technician!==undefined&&{technician:d.technician}),
   ...(d.spareParts!==undefined&&{spareParts:d.spareParts}),
   ...(d.cost!==undefined&&{cost:d.cost}),
   ...(d.startedAt!==undefined&&{startedAt:new Date(d.startedAt)}),
   ...(d.endedAt!==undefined&&{endedAt:d.endedAt?new Date(d.endedAt):null}),
  }});
  if(d.machineStatus!==undefined){
   const machine=await this.prisma.machine.update({where:{id:updated.machineId},data:{status:d.machineStatus}});
   await notifyRoles(this.prisma,MANAGEMENT_ROLES,{
    title:'Machine status updated',
    message:`${machine.code} set to ${d.machineStatus}`,
    type:d.machineStatus==='BREAKDOWN'?'MACHINE_BREAKDOWN':d.machineStatus==='MAINTENANCE'?'MAINTENANCE_DUE':'SYSTEM',
    priority:d.machineStatus==='BREAKDOWN'?'CRITICAL':'NORMAL',
    referenceType:'Machine',
    referenceId:machine.id,
   });
  }
  return updated;
 }
 @Patch('maintenance/:id/complete') async complete(@Param('id') id:string,@Body() b:{resolution?:string}){
  const r=await this.prisma.maintenanceRecord.update({where:{id},data:{endedAt:new Date(),resolution:b.resolution},include:{machine:true}});
  await this.prisma.machine.update({where:{id:r.machineId},data:{status:'IDLE'}});
  await notifyRoles(this.prisma,MANAGEMENT_ROLES,{
   title:'Machine maintenance completed',
   message:`${r.machine.code} is back to IDLE${b.resolution?` • ${b.resolution}`:''}`,
   type:'SYSTEM',
   referenceType:'MaintenanceRecord',
   referenceId:id,
  });
  return r;
 }
}
