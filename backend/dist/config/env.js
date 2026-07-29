import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
const currentFileDir = dirname(fileURLToPath(import.meta.url));
const backendRootDir = resolve(currentFileDir, "../..");
config({ path: resolve(backendRootDir, ".env") });
const envSchema = z.object({
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    FRONTEND_ORIGIN: z.string().min(1),
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_JWT_SECRET: z.string().min(1),
    DISCORD_WEBHOOK_URL: z.string().url().optional(),
    DISCORD_NOTIFY_ROLE_ID: z.string().min(1).optional(),
    DISCORD_BOT_TOKEN: z.string().min(1).optional(),
    DISCORD_CODE_CHANNEL_ID: z.string().min(1).optional(),
    DISCORD_CODE_REPORT_WEBHOOK_URL: z.string().url().optional(),
    DISCORD_CODE_AUTOMATION_ENABLED: z.coerce.boolean().default(false),
    RUN_DISCORD_AUTOMATION_ON_WEB: z.coerce.boolean().default(true),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error("Invalid environment variables", parsedEnv.error.flatten().fieldErrors);
    process.exit(1);
}
if (parsedEnv.data.SUPABASE_JWT_SECRET === "REPLACE_WITH_SUPABASE_JWT_SECRET") {
    console.error("Invalid environment variables", {
        SUPABASE_JWT_SECRET: ["Replace SUPABASE_JWT_SECRET with the actual JWT secret from Supabase."],
    });
    process.exit(1);
}
export const env = parsedEnv.data;
