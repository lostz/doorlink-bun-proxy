import { Hono } from "hono";

type EnvConfig = {
  port: number;
  token: string;
  doorlinkUrl: string;
  sipFrom: string;
  sipTo: string;
  family: string;
  timeoutMs: number;
};

function requiredEnv(name: string): string {
  const value = Bun.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadConfig(): EnvConfig {
  return {
    port: Number(Bun.env.PORT || "3000"),
    token: requiredEnv("OPEN_DOOR_TOKEN"),
    doorlinkUrl: requiredEnv("DOORLINK_URL"),
    sipFrom: requiredEnv("DOORLINK_FROM"),
    sipTo: Bun.env.DOORLINK_TO || "",
    family: Bun.env.DOORLINK_FAMILY || "1",
    timeoutMs: Number(Bun.env.DOORLINK_TIMEOUT_MS || "3000"),
  };
}

const config = loadConfig();
const app = new Hono();

function isAuthorized(authHeader: string | undefined): boolean {
  return authHeader === `Bearer ${config.token}`;
}

function buildUnlockPayload(): URLSearchParams {
  const form = new URLSearchParams();
  form.set("from", config.sipFrom);
  form.set("to", config.sipTo);
  form.set("event", "unlock");
  form.set("family", config.family);
  form.set("elev", "0");
  form.set("direct", "1");
  return form;
}

app.get("/health", (c) => {
  return c.json({ ok: true });
});

app.post("/open-door", async (c) => {
  if (!isAuthorized(c.req.header("authorization"))) {
    return c.json({ ok: false, error: "unauthorized" }, 401);
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(config.doorlinkUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: buildUnlockPayload(),
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    const responseText = await response.text();
    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      return c.json(
        {
          ok: false,
          error: "doorlink_request_failed",
          status: response.status,
          elapsedMs,
          response: responseText,
        },
        502,
      );
    }

    return c.json({
      ok: true,
      status: response.status,
      elapsedMs,
      response: responseText,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);

    return c.json(
      {
        ok: false,
        error: "doorlink_request_error",
        elapsedMs,
        message,
      },
      504,
    );
  }
});

Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`doorlink-bun-proxy listening on :${config.port}`);
