import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class BatchAnalysisItemDto {
  @ApiProperty({ description: "Disaster report text to classify", example: "Heavy flooding on main road." })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: "Optional client correlation/report identifier", required: false })
  @IsString()
  @IsOptional()
  requestId?: string;
}

export class BatchAnalysisDto {
  @ApiProperty({ type: [BatchAnalysisItemDto], description: "List of items for batch inference (1-100)" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BatchAnalysisItemDto)
  items: BatchAnalysisItemDto[];
}

