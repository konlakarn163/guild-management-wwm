import { config } from "dotenv";
import { z } from "zod";
config();
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
