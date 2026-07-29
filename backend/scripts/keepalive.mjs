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
  // Don't fail on any status - the goal is just to trigger the service to wake up
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[keepalive] request failed: ${message}`);
  // Still exit 0 because the service might be spinning up
  process.exit(0);
} finally {
  clearTimeout(timeout);
}
