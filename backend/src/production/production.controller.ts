import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/auth-user';
import { ProductionService } from './production.service';
import {
  CompleteFabricFlowDto,
  CreateFabricFlowDto,
  UpdateFabricCompactingDto,
  UpdateFabricDyeingDto,
  UpdateFabricKnittingDto,
} from './dto/fabric-flow.dto';
import {
  ApproveKnittingDto,
  ApproveYarnDto,
  CreateDyeingBatchDto,
  CreateFinishingDto,
  CreateKnittingJobDto,
  DyeingEntryDto,
  FinalQcDto,
  KnittingEntryDto,
  YarnEntryDto,
} from './dto/production.dto';

@Controller('production')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProductionController {
  constructor(private service: ProductionService) {}

  @Get('fabric-flows')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  fabricFlows() {
    return this.service.fabricFlows();
  }

  @Post('fabric-flows')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  createFabricFlow(@Body() dto: CreateFabricFlowDto) {
    return this.service.createFabricFlow(dto);
  }

  @Post('fabric-flows/:id/knitting')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  updateFabricKnitting(@Param('id') id: string, @Body() dto: UpdateFabricKnittingDto) {
    return this.service.updateFabricKnitting(id, dto);
  }

  @Post('fabric-flows/:id/dyeing')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  updateFabricDyeing(@Param('id') id: string, @Body() dto: UpdateFabricDyeingDto) {
    return this.service.updateFabricDyeing(id, dto);
  }

  @Post('fabric-flows/:id/compacting')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  updateFabricCompacting(@Param('id') id: string, @Body() dto: UpdateFabricCompactingDto) {
    return this.service.updateFabricCompacting(id, dto);
  }

  @Post('fabric-flows/:id/final')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  completeFabricFlow(@Param('id') id: string, @Body() dto: CompleteFabricFlowDto) {
    return this.service.completeFabricFlow(id, dto);
  }

  @Get('context')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  context() {
    return this.service.context();
  }

  @Get('my-jobs')
  @Roles(Role.WORKER)
  my(@CurrentUser() user: AuthUser) {
    return this.service.myJobs(user);
  }

  @Get('approvals')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  approvals() {
    return this.service.approvals();
  }

  @Post('yarn/entries')
  @Roles(Role.SUPERADMIN, Role.MANAGER, Role.WORKER)
  yarn(@Body() dto: YarnEntryDto, @CurrentUser() user: AuthUser) {
    return this.service.yarnEntry(dto, user);
  }

  @Post('yarn/entries/:id/approve')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  approveYarn(@Param('id') id: string, @Body() dto: ApproveYarnDto, @CurrentUser() user: AuthUser) {
    return this.service.approveYarn(id, dto, user);
  }

  @Post('knitting/jobs')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  knittingJob(@Body() dto: CreateKnittingJobDto, @CurrentUser() user: AuthUser) {
    return this.service.createKnittingJob(dto, user);
  }

  @Post('knitting/jobs/:id/entries')
  @Roles(Role.SUPERADMIN, Role.MANAGER, Role.WORKER)
  knittingEntry(@Param('id') id: string, @Body() dto: KnittingEntryDto, @CurrentUser() user: AuthUser) {
    return this.service.knittingEntry(id, dto, user);
  }

  @Post('knitting/entries/:id/approve')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  approveKnitting(@Param('id') id: string, @Body() dto: ApproveKnittingDto, @CurrentUser() user: AuthUser) {
    return this.service.approveKnitting(id, dto, user);
  }

  @Post('dyeing/batches')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  dyeingBatch(@Body() dto: CreateDyeingBatchDto, @CurrentUser() user: AuthUser) {
    return this.service.createDyeingBatch(dto, user);
  }

  @Post('dyeing/batches/:id/entries')
  @Roles(Role.SUPERADMIN, Role.MANAGER, Role.WORKER)
  dyeingEntry(@Param('id') id: string, @Body() dto: DyeingEntryDto, @CurrentUser() user: AuthUser) {
    return this.service.dyeingEntry(id, dto, user);
  }

  @Post('dyeing/entries/:id/approve')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  approveDyeing(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.approveDyeing(id, user);
  }

  @Post('finishing')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  finishing(@Body() dto: CreateFinishingDto) {
    return this.service.createFinishing(dto);
  }

  @Post('qc/final')
  @Roles(Role.SUPERADMIN, Role.MANAGER)
  finalQuality(@Body() dto: FinalQcDto, @CurrentUser() user: AuthUser) {
    return this.service.finalQc(dto, user);
  }
}
