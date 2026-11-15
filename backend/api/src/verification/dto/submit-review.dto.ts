import { IsString, IsOptional, IsEnum, IsUUID } from "class-validator";
import { ReviewDecision } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SubmitReviewDto {
  @ApiProperty({
    enum: ReviewDecision,
    example: ReviewDecision.VERIFIED_DISASTER,
    description: "Official human verification decision",
  })
  @IsEnum(ReviewDecision)
  decision: ReviewDecision;

  @ApiPropertyOptional({
    example: "Verified by municipal emergency dispatch coordinator via field radio.",
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: "Optional incident UUID if associating during review",
  })
  @IsOptional()
  @IsUUID()
  incidentId?: string;

  @ApiPropertyOptional({
    description: "Optional reviewer UUID (defaults to seeded development reviewer)",
  })
  @IsOptional()
  @IsUUID()
  reviewerId?: string;
}

