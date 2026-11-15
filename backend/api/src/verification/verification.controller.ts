import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { VerificationService } from "./verification.service";
import { SubmitReviewDto } from "./dto/submit-review.dto";

@ApiTags("Verification")
@Controller("verification")
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get()
  @ApiOperation({ summary: "List reports awaiting review or filtered by review decision" })
  async listReportsForVerification(@Query("status") status?: string) {
    return this.verificationService.listReportsForVerification(status);
  }

  @Get(":reportId")
  @ApiOperation({ summary: "Retrieve review details and previous history for a report" })
  async getReviewDetails(@Param("reportId", ParseUUIDPipe) reportId: string) {
    return this.verificationService.getReviewDetails(reportId);
  }

  @Post(":reportId/review")
  @ApiOperation({ summary: "Submit an official human review decision for a report" })
  @ApiResponse({ status: 201, description: "Review recorded in append-only history" })
  async submitReview(
    @Param("reportId", ParseUUIDPipe) reportId: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.verificationService.submitReview(reportId, dto);
  }

  @Get(":reportId/history")
  @ApiOperation({ summary: "Retrieve immutable audit history of reviews for a report" })
  async getReviewHistory(@Param("reportId", ParseUUIDPipe) reportId: string) {
    return this.verificationService.getReviewHistory(reportId);
  }
}

