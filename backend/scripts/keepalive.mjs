import process from "node:process";

const targetUrl = process.env.KEEPALIVE_URL;

if (!targetUrl) {
  console.error("KEEPALIVE_URL is required");
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

try {
  const response = await fetch(targetUrl, {
    method: "GET",
    signal: controller.signal,
    headers: {
      "User-Agent": "render-keepalive/1.0",
    },
  });

  console.log(`[keepalive] ${response.status} ${response.statusText} ${targetUrl}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[keepalive] failed: ${message}`);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
