import { spawn } from "child_process";

async function main() {
  console.log("🚀 Starting NestJS API server for E2E suite...");

  const server = spawn("node", ["dist/src/main.js"], {
    cwd: "E:\\NLP\\aapdawatch-ai\\backend\\api",
    env: { ...process.env, PORT: "3001" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (data) => {
    // console.log(data.toString());
  });

  // Wait 4 seconds for NestJS to bootstrap
  await new Promise((r) => setTimeout(r, 4000));

  try {
    const testRunner = spawn(
      "node",
      ["scripts/test-phase2-1-e2e.mjs"],
      {
        cwd: "E:\\NLP\\aapdawatch-ai",
        stdio: "inherit",
      },
    );

    testRunner.on("close", (code) => {
      server.kill();
      process.exit(code);
    });
  } catch (err) {
    server.kill();
    console.error(err);
    process.exit(1);
  }
}

main();
