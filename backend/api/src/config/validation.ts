import { plainToInstance } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from "class-validator";

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3001;

  @IsString()
  @IsOptional()
  API_PREFIX: string = "api/v1";

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  FRONTEND_ORIGIN: string = "http://localhost:3000";

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = "debug";
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors.map((e) => Object.values(e.constraints || {})).flat();
    throw new Error(`Environment variable validation error:\n${messages.join("\n")}`);
  }

  return validatedConfig;
}

