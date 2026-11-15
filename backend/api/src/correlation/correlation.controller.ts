import { Controller, Get, Post, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CorrelationService } from "./correlation.service";

@ApiTags("Correlation")
@Controller("correlation")
export class CorrelationController {
  constructor(private readonly correlationService: CorrelationService) {}

  @Get("candidates")
  @ApiOperation({ summary: "List pending incident correlation suggestions for human review" })
  async listCandidates() {
    return this.correlationService.listCandidates();
  }

  @Post("candidates/:id/accept")
  @ApiOperation({ summary: "Accept correlation: link report to target incident folder atomically" })
  @ApiResponse({ status: 200, description: "Candidate accepted and association established" })
  async acceptCandidate(@Param("id") id: string) {
    return this.correlationService.acceptCandidate(id);
  }

  @Post("candidates/:id/reject")
  @ApiOperation({ summary: "Reject correlation: mark candidate as rejected" })
  async rejectCandidate(@Param("id") id: string) {
    return this.correlationService.rejectCandidate(id);
  }

  @Post("generate")
  @ApiOperation({ summary: "Generate candidate suggestions between unlinked reports and active incidents" })
  async generateCandidates() {
    return this.correlationService.generateCandidateSuggestions();
  }
}

