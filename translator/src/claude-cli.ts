/**
 * Claude CLI adapter for translation
 */

/**
 * Call Claude CLI with a prompt
 */
export async function callClaudeCli(
  prompt: string,
  model?: string,
): Promise<string> {
  const args = ["-p"];
  if (model) {
    args.push("--model", model);
  }
  args.push(prompt);

  // Remove ANTHROPIC_API_KEY from environment to prevent CLI from using API mode
  // Instead, it will use the session authentication from the current Claude CLI session
  const cleanEnv = { ...process.env };
  delete cleanEnv.ANTHROPIC_API_KEY;

  const proc = Bun.spawn(["claude", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: cleanEnv,
  });

  const [output, errorOutput] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(
      `Claude CLI exited with code ${exitCode}${errorOutput ? `\nError: ${errorOutput}` : ""}${output ? `\nOutput: ${output}` : ""}`,
    );
  }

  return output;
}
