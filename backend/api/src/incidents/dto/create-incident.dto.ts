import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from "class-validator";
import { DisasterCategory, IncidentSeverity, OperationalStatus } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateIncidentDto {
  @ApiProperty({ example: "INC-2026-MUM-001" })
  @IsOptional()
  @IsString()
  incidentCode?: string;

  @ApiProperty({ example: "Mumbai Central Urban Flash Flood" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: "Severe waterlogging across low-lying railway tracks and residential colonies." })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: DisasterCategory, example: DisasterCategory.FLOOD })
  @IsEnum(DisasterCategory)
  category: DisasterCategory;

  @ApiProperty({ enum: IncidentSeverity, example: IncidentSeverity.CRITICAL })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiPropertyOptional({ enum: OperationalStatus, default: OperationalStatus.OPEN })
  @IsOptional()
  @IsEnum(OperationalStatus)
  operationalStatus?: OperationalStatus;

  @ApiProperty({ example: "Mumbai, Maharashtra" })
  @IsString()
  @IsNotEmpty()
  locationName: string;

  @ApiPropertyOptional({ example: 19.076, minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 72.8777, minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: "2026-11-15T02:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  startedAt?: string;
}

