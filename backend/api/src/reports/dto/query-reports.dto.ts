import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ReportSourceType, DisasterCategory, ReviewDecision } from "@prisma/client";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryReportsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ReportSourceType })
  @IsOptional()
  @IsEnum(ReportSourceType)
  sourceType?: ReportSourceType;

  @ApiPropertyOptional({ enum: DisasterCategory })
  @IsOptional()
  @IsEnum(DisasterCategory)
  category?: DisasterCategory;

  @ApiPropertyOptional({ enum: ReviewDecision })
  @IsOptional()
  @IsEnum(ReviewDecision)
  reviewStatus?: ReviewDecision;

  @ApiPropertyOptional({ example: "unreviewed" })
  @IsOptional()
  @IsString()
  status?: string; // support frontend "unreviewed", "under-review", "verified", etc.
}

