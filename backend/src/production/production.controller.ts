import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport'; import { Role } from '@prisma/client'; import { CurrentUser } from '../common/decorators/current-user.decorator'; import { Roles } from '../common/decorators/roles.decorator'; import { RolesGuard } from '../common/guards/roles.guard'; import { AuthUser } from '../common/auth-user'; import { ProductionService } from './production.service'; import { ApproveKnittingDto, ApproveYarnDto, CreateDyeingBatchDto, CreateFinishingDto, CreateKnittingJobDto, DyeingEntryDto, FinalQcDto, KnittingEntryDto, YarnEntryDto } from './dto/production.dto';
@Controller('production') @UseGuards(AuthGuard('jwt'),RolesGuard) export class ProductionController {constructor(private s:ProductionService){}
 @Get('context') @Roles(Role.SUPERADMIN,Role.MANAGER) context(){return this.s.context()}
 @Get('my-jobs') @Roles(Role.WORKER) my(@CurrentUser() u:AuthUser){return this.s.myJobs(u)}
 @Get('approvals') @Roles(Role.SUPERADMIN,Role.MANAGER) approvals(){return this.s.approvals()}
 @Post('yarn/entries') @Roles(Role.SUPERADMIN,Role.MANAGER,Role.WORKER) yarn(@Body() d:YarnEntryDto,@CurrentUser() u:AuthUser){return this.s.yarnEntry(d,u)}
 @Post('yarn/entries/:id/approve') @Roles(Role.SUPERADMIN,Role.MANAGER) approveYarn(@Param('id') id:string,@Body() d:ApproveYarnDto,@CurrentUser() u:AuthUser){return this.s.approveYarn(id,d,u)}
 @Post('knitting/jobs') @Roles(Role.SUPERADMIN,Role.MANAGER) knitJob(@Body() d:CreateKnittingJobDto,@CurrentUser() u:AuthUser){return this.s.createKnittingJob(d,u)}
 @Post('knitting/jobs/:id/entries') @Roles(Role.SUPERADMIN,Role.MANAGER,Role.WORKER) knitEntry(@Param('id') id:string,@Body() d:KnittingEntryDto,@CurrentUser() u:AuthUser){return this.s.knittingEntry(id,d,u)}
 @Post('knitting/entries/:id/approve') @Roles(Role.SUPERADMIN,Role.MANAGER) approveKnit(@Param('id') id:string,@Body() d:ApproveKnittingDto,@CurrentUser() u:AuthUser){return this.s.approveKnitting(id,d,u)}
 @Post('dyeing/batches') @Roles(Role.SUPERADMIN,Role.MANAGER) dyeBatch(@Body() d:CreateDyeingBatchDto,@CurrentUser() u:AuthUser){return this.s.createDyeingBatch(d,u)}
 @Post('dyeing/batches/:id/entries') @Roles(Role.SUPERADMIN,Role.MANAGER,Role.WORKER) dyeEntry(@Param('id') id:string,@Body() d:DyeingEntryDto,@CurrentUser() u:AuthUser){return this.s.dyeingEntry(id,d,u)}
 @Post('dyeing/entries/:id/approve') @Roles(Role.SUPERADMIN,Role.MANAGER) approveDye(@Param('id') id:string,@CurrentUser() u:AuthUser){return this.s.approveDyeing(id,u)}
 @Post('finishing') @Roles(Role.SUPERADMIN,Role.MANAGER) finishing(@Body() d:CreateFinishingDto){return this.s.createFinishing(d)}
 @Post('qc/final') @Roles(Role.SUPERADMIN,Role.MANAGER) qc(@Body() d:FinalQcDto,@CurrentUser() u:AuthUser){return this.s.finalQc(d,u)}
}
