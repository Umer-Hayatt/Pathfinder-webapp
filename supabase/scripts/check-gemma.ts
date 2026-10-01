// One small, real inference; no fallback and no automatic retry.
// Supply GEMINI_API_KEY through the environment or Deno's --env-file flag.
const model = "gemma-4-26b-a4b-it";
const key = Deno.env.get("GEMINI_API_KEY")?.trim();
const configuredModel = Deno.env.get("GEMMA_MODEL");
const started = performance.now();

function report(result: Record<string, unknown>, exitCode: number): never {
  let line = JSON.stringify({
    model,
    latencyMs: Math.round(performance.now() - started),
    ...result,
  });
  // The only secret available to this process is the provider key.
  if (key) line = line.replaceAll(key, "[REDACTED]");
  line = line.replace(/AIza[\w-]+/g, "[REDACTED]");
  console.log(line);
  Deno.exit(exitCode);
}

if (!key || /^(replace_|your_|<)/i.test(key)) {
  report({
    live: false,
    ok: false,
    code: "SERVICE_NOT_CONFIGURED",
    message: "Set GEMINI_API_KEY privately; no provider request was sent.",
  }, 2);
}
if (configuredModel && configuredModel !== model) {
  report({
    live: false,
    ok: false,
    code: "MODEL_CONFIGURATION_MISMATCH",
    message: `GEMMA_MODEL must be ${model}; no provider request was sent.`,
  }, 2);
}

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 20_000);
try {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      redirect: "error",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key! },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: "Reply with the single word READY." }],
        }],
        generationConfig: {
          maxOutputTokens: 64,
          thinkingConfig: { thinkingLevel: "minimal" },
        },
      }),
    },
  );
  const reader = response.body?.getReader();
  if (!reader) throw new Error("EMPTY_PROVIDER_BODY");
  let bytes = 0;
  let body = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65_536) {
        controller.abort();
        throw new Error("PROVIDER_BODY_TOO_LARGE");
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  const payload = JSON.parse(body);
  if (!response.ok) {
    // Keep the exact provider status/message for the smoke-check checkpoint,
    // with key redaction in report(). Never print headers or raw payloads.
    report({
      live: true,
      ok: false,
      httpStatus: response.status,
      code: typeof payload?.error?.status === "string"
        ? payload.error.status
        : "MODEL_ERROR",
      message: typeof payload?.error?.message === "string"
        ? payload.error.message
        : "Provider returned no structured error message.",
    }, 1);
  }
  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text).join("").trim()
    : "";
  if (!text || candidate?.finishReason !== "STOP") {
    report({
      live: true,
      ok: false,
      httpStatus: response.status,
      code: "INVALID_MODEL_OUTPUT",
      message: "Provider did not return completed non-empty text.",
    }, 1);
  }
  report({
    live: true,
    ok: true,
    httpStatus: response.status,
    outputCharacters: text.length,
    finishReason: "STOP",
  }, 0);
} catch (error) {
  const known = error instanceof Error &&
    ["EMPTY_PROVIDER_BODY", "PROVIDER_BODY_TOO_LARGE"].includes(error.message);
  report({
    live: true,
    ok: false,
    code: known
      ? (error as Error).message
      : controller.signal.aborted
      ? "UPSTREAM_TIMEOUT"
      : "MODEL_ERROR",
    message: error instanceof SyntaxError
      ? "Provider returned invalid JSON."
      : "Inference did not complete; no fallback or retry was attempted.",
  }, 1);
} finally {
  clearTimeout(timer);
}
