#!/usr/bin/env bun

const siteId = process.env.NETLIFY_SITE_ID;

if (!siteId) {
  console.error("Error: NETLIFY_SITE_ID not found in environment variables");
  console.error("Please ensure it's set in your .env file");
  process.exit(1);
}

// Generate pages first
console.log("Generating pages...");
const generateProc = Bun.spawn(["bun", "run", "generator/generate-pages.ts"], {
  stdout: "inherit",
  stderr: "inherit",
});

const generateExitCode = await generateProc.exited;
if (generateExitCode !== 0) {
  console.error("Generate failed with exit code:", generateExitCode);
  process.exit(generateExitCode);
}

console.log("\nDeploying to Netlify...");
const deployProc = Bun.spawn(
  [
    "netlify",
    "deploy",
    "--site",
    siteId,
    "--dir",
    "./reader",
    "--prod",
    "--no-build",
  ],
  {
    stdout: "inherit",
    stderr: "inherit",
  },
);

const exitCode = await deployProc.exited;
process.exit(exitCode);
