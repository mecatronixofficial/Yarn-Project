import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateFabricFlowDto {
  @IsDateString() purchaseDate!: string;
  @IsString() @IsNotEmpty() piNo!: string;
  @IsString() @IsNotEmpty() partyDetails!: string;
  @IsString() @IsNotEmpty() millDetails!: string;
  @IsString() @IsNotEmpty() yarnCount!: string;
  @IsInt() @Min(1) bagCount!: number;
  @IsNumber() @Min(0.001) purchasedWeightKg!: number;
  @IsNumber() @Min(0) yarnRatePerKg!: number;
  @IsNumber() @Min(0) purchaseOtherCost!: number;
  @IsString() @IsNotEmpty() deliveryPlace!: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateFabricKnittingDto {
  @IsDateString() knittingDate!: string;
  @IsString() @IsNotEmpty() knittingPiNo!: string;
  @IsString() @IsNotEmpty() knittingPartyDetails!: string;
  @IsString() @IsNotEmpty() knittingMillDetails!: string;
  @IsString() @IsNotEmpty() knittingYarnStock!: string;
  @IsString() @IsNotEmpty() knittingFabricStock!: string;
  @IsOptional() @IsString() knittingGg?: string;
  @IsOptional() @IsString() knittingLl?: string;
  @IsNumber() @Min(0) yarnReceivedKg!: number;
  @IsNumber() @Min(0) dailyProductivityKg!: number;
  @IsNumber() @Min(0) knittingDeliveryKg!: number;
  @IsNumber() @Min(0) knittingExpense!: number;
  @IsNumber() @Min(0) dyeingDeliveryKg!: number;
}

export class UpdateFabricDyeingDto {
  @IsDateString() dyeingDate!: string;
  @IsString() @IsNotEmpty() dyeingPiNo!: string;
  @IsString() @IsNotEmpty() dyeingPartyDetails!: string;
  @IsString() @IsNotEmpty() dyeingMillDetails!: string;
  @IsNumber() @Min(0) fabricReceivedKg!: number;
  @IsNumber() @Min(0) dyeingGreyWeightKg!: number;
  @IsString() @IsNotEmpty() color!: string;
  @IsString() @IsNotEmpty() dyeingCount!: string;
  @IsInt() @Min(0) rollCount!: number;
  @IsNumber() @Min(0) dyeingOutputWeightKg!: number;
  @IsNumber() @Min(0) dyeingExpense!: number;
  @IsNumber() @Min(0) compactingDeliveryKg!: number;
}

export class UpdateFabricCompactingDto {
  @IsDateString() compactingDate!: string;
  @IsString() @IsNotEmpty() compactingInwardNo!: string;
  @IsNumber() @Min(0) compactingReceivedKg!: number;
  @IsString() @IsNotEmpty() compactingOutwardNo!: string;
  @IsNumber() @Min(0) officeDeliveryKg!: number;
  @IsNumber() @Min(0) compactingExpense!: number;
}

export class CompleteFabricFlowDto {
  @IsDateString() finalDate!: string;
  @IsNumber() @Min(0) finalDeliveredKg!: number;
  @IsNumber() @Min(0) collectedAmount!: number;
  @IsNumber() @Min(0) otherExpense!: number;
  @IsOptional() @IsString() notes?: string;
}
