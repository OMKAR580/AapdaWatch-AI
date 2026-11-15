import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsUrl,
  IsDateString,
} from "class-validator";
import { ReportSourceType } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateReportDto {
  @ApiProperty({
    description: "The raw incoming disaster report message or dispatch text",
    example: "Severe flooding near Dadar station after continuous heavy rain. Water level rising fast.",
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({
    enum: ReportSourceType,
    default: ReportSourceType.SOCIAL_MEDIA,
  })
  @IsOptional()
  @IsEnum(ReportSourceType)
  sourceType?: ReportSourceType;

  @ApiPropertyOptional({ example: "Twitter / X", description: "Source platform or channel" })
  @IsOptional()
  @IsString()
  sourceName?: string;

  @ApiPropertyOptional({ example: "https://x.com/user/status/12345678" })
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiPropertyOptional({ example: "Mumbai, Maharashtra" })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiPropertyOptional({ example: 19.0178, minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 72.8478, minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: "2026-11-15T03:30:00.000Z" })
  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @ApiPropertyOptional({ example: "en" })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: "External system or feed reference ID" })
  @IsOptional()
  @IsString()
  externalId?: string;
}

