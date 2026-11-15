import { IsEnum, IsNotEmpty } from "class-validator";
import { OperationalStatus } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateIncidentStatusDto {
  @ApiProperty({ enum: OperationalStatus, example: OperationalStatus.MONITORING })
  @IsEnum(OperationalStatus)
  @IsNotEmpty()
  status: OperationalStatus;
}

