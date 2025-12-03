/**
 * Tenex HTTP Bridge Service
 *
 * This service wraps tenex CLI commands in an HTTP API that n8n can call.
 * It enables multi-agent AI analysis through the tenex platform.
 *
 * Endpoints:
 *   POST /analyze - Run analysis through tenex agents
 *   POST /verify  - Verify/validate AI outputs
 *   GET  /health  - Health check
 */

import { serve } from "bun";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";

// Configuration
const PORT = process.env.TENEX_BRIDGE_PORT || 3001;
const TENEX_PATH = process.env.TENEX_PATH || "../tenex";
const TIMEOUT_MS = parseInt(process.env.TENEX_TIMEOUT || "120000");

interface AnalyzeRequest {
  data: Record<string, unknown>;
  prompt: string;
  phase?: "chat" | "brainstorm" | "plan" | "execute" | "verification" | "reflection";
  systemContext?: string;
}

interface VerifyRequest {
  originalData: Record<string, unknown>;
  aiOutput: string;
  validationRules?: string[];
}

/**
 * Execute tenex CLI command and return output
 */
async function executeTenex(
  phase: string,
  message: string,
  contextData?: Record<string, unknown>
): Promise<{ success: boolean; output: string; error?: string }> {
  const requestId = randomUUID().slice(0, 8);
  const tempFile = `/tmp/tenex-context-${requestId}.json`;

  try {
    // Write context data to temp file if provided
    if (contextData) {
      await writeFile(tempFile, JSON.stringify(contextData, null, 2));
    }

    // Build command
    const args = ["run", "tenex", "debug", "chat", "--phase", phase, "--message", message];

    if (contextData) {
      args.push("--context-file", tempFile);
    }

    return new Promise((resolve) => {
      const proc = spawn("bun", args, {
        cwd: TENEX_PATH,
        timeout: TIMEOUT_MS,
        env: { ...process.env },
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", async (code) => {
        // Cleanup temp file
        if (contextData) {
          try {
            await unlink(tempFile);
          } catch {}
        }

        if (code === 0) {
          resolve({ success: true, output: stdout.trim() });
        } else {
          resolve({
            success: false,
            output: stdout.trim(),
            error: stderr || `Process exited with code ${code}`,
          });
        }
      });

      proc.on("error", async (err) => {
        if (contextData) {
          try {
            await unlink(tempFile);
          } catch {}
        }
        resolve({ success: false, output: "", error: err.message });
      });
    });
  } catch (err) {
    return {
      success: false,
      output: "",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fallback analysis using direct LLM call (if tenex fails)
 */
async function fallbackAnalysis(
  data: Record<string, unknown>,
  prompt: string
): Promise<{ success: boolean; output: string; fallback: boolean }> {
  // This would call OpenRouter directly as a fallback
  // For now, return an error indicating tenex is unavailable
  return {
    success: false,
    output: "",
    fallback: true,
  };
}

// HTTP Server
serve({
  port: Number(PORT),

  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (path === "/health" && req.method === "GET") {
      return Response.json(
        {
          status: "healthy",
          service: "tenex-bridge",
          timestamp: new Date().toISOString(),
          tenexPath: TENEX_PATH,
        },
        { headers: corsHeaders }
      );
    }

    // Analyze endpoint - main entry point for n8n
    if (path === "/analyze" && req.method === "POST") {
      try {
        const body: AnalyzeRequest = await req.json();
        const { data, prompt, phase = "execute", systemContext } = body;

        if (!data || !prompt) {
          return Response.json(
            { success: false, error: "Missing required fields: data, prompt" },
            { status: 400, headers: corsHeaders }
          );
        }

        // Build the full prompt with context
        const fullPrompt = systemContext
          ? `${systemContext}\n\n---\n\n${prompt}`
          : prompt;

        console.log(`[${new Date().toISOString()}] Analyze request - Phase: ${phase}`);

        const result = await executeTenex(phase, fullPrompt, data);

        if (result.success) {
          return Response.json(
            {
              success: true,
              output: result.output,
              phase,
              timestamp: new Date().toISOString(),
            },
            { headers: corsHeaders }
          );
        } else {
          // Try fallback
          console.log(`[${new Date().toISOString()}] Tenex failed, attempting fallback`);

          return Response.json(
            {
              success: false,
              error: result.error,
              output: result.output,
              phase,
              timestamp: new Date().toISOString(),
            },
            { status: 500, headers: corsHeaders }
          );
        }
      } catch (err) {
        console.error("Analyze error:", err);
        return Response.json(
          {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Verify endpoint - validate AI outputs
    if (path === "/verify" && req.method === "POST") {
      try {
        const body: VerifyRequest = await req.json();
        const { originalData, aiOutput, validationRules = [] } = body;

        const verificationPrompt = `
You are a verification agent. Your task is to validate the following AI-generated analysis.

## Original Data
${JSON.stringify(originalData, null, 2)}

## AI Output to Verify
${aiOutput}

## Validation Rules
${validationRules.length > 0 ? validationRules.map((r, i) => `${i + 1}. ${r}`).join("\n") : "- Check for factual accuracy based on the data\n- Ensure all numbers are correct\n- Verify no hallucinated information"}

## Your Task
1. Verify the AI output against the original data
2. List any inaccuracies or concerns
3. Provide a confidence score (0-100)
4. Suggest corrections if needed

Respond in JSON format:
{
  "valid": true/false,
  "confidence": 0-100,
  "issues": ["issue1", "issue2"],
  "corrections": ["correction1"],
  "summary": "brief summary"
}
`;

        const result = await executeTenex("verification", verificationPrompt, {
          originalData,
          aiOutput,
        });

        return Response.json(
          {
            success: result.success,
            verification: result.output,
            timestamp: new Date().toISOString(),
          },
          { headers: corsHeaders }
        );
      } catch (err) {
        return Response.json(
          {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Multi-phase analysis (for complex queries)
    if (path === "/multi-phase" && req.method === "POST") {
      try {
        const body = await req.json();
        const { data, prompt, phases = ["plan", "execute", "verification"] } = body;

        const results: Record<string, unknown> = {};

        for (const phase of phases) {
          const phasePrompt =
            phase === "plan"
              ? `Create an analysis plan for: ${prompt}`
              : phase === "verification"
                ? `Verify and validate the analysis: ${JSON.stringify(results)}`
                : prompt;

          const result = await executeTenex(phase, phasePrompt, {
            ...data,
            previousPhases: results,
          });

          results[phase] = {
            success: result.success,
            output: result.output,
            error: result.error,
          };

          // Stop if a phase fails (except verification)
          if (!result.success && phase !== "verification") {
            break;
          }
        }

        return Response.json(
          {
            success: true,
            phases: results,
            timestamp: new Date().toISOString(),
          },
          { headers: corsHeaders }
        );
      } catch (err) {
        return Response.json(
          {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
});

console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Tenex HTTP Bridge Service                       ║
╠═══════════════════════════════════════════════════════════╣
║  Port:        ${String(PORT).padEnd(42)}║
║  Tenex Path:  ${TENEX_PATH.padEnd(42)}║
║  Timeout:     ${(TIMEOUT_MS / 1000 + "s").padEnd(42)}║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                               ║
║    POST /analyze     - Run tenex analysis                 ║
║    POST /verify      - Verify AI outputs                  ║
║    POST /multi-phase - Multi-phase analysis               ║
║    GET  /health      - Health check                       ║
╚═══════════════════════════════════════════════════════════╝
`);
