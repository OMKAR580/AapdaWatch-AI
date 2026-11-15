import { IsUUID, IsEnum, IsOptional } from "class-validator";
import { RelationshipType } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddReportToIncidentDto {
  @ApiProperty({ description: "UUID of the DisasterReport to associate" })
  @IsUUID()
  reportId: string;

  @ApiPropertyOptional({ enum: RelationshipType, default: RelationshipType.CORROBORATING_EVIDENCE })
  @IsOptional()
  @IsEnum(RelationshipType)
  relationshipType?: RelationshipType;
}

