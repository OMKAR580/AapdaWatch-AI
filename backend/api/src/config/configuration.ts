export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  frontendOrigin: string;
  logLevel: string;
}

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3001", 10),
  apiPrefix: process.env.API_PREFIX || "api/v1",
  databaseUrl: process.env.DATABASE_URL || "",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  logLevel: process.env.LOG_LEVEL || "debug",
});

