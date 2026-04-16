import cors from "cors";
import express from "express";
import morgan from "morgan";
import { requireAuth } from "./middlewares/auth.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { guildSettingsRouter } from "./routes/guild-settings.route.js";
import { guildWarRouter } from "./routes/guild-war.route.js";
import { mapStrategiesRouter } from "./routes/map-strategies.route.js";
import { profileRouter } from "./routes/profile.route.js";
import { publicRouter } from "./routes/public.route.js";
import { teamsRouter } from "./routes/teams.route.js";
import { usersRouter } from "./routes/users.route.js";

export const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options('*', cors());

// 3. ปิด Helmet ชั่วคราว (ถ้าผ่านแล้วค่อยกลับมาเปิด)
// import helmet from "helmet";
// app.use(helmet());

app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ service: "guild-management-backend", status: "ok" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/public", publicRouter);
app.use("/api", requireAuth);
app.use("/api/profile", profileRouter);
app.use("/api/users", usersRouter);
app.use("/api/guild-war", guildWarRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/map-strategies", mapStrategiesRouter);
app.use("/api/guild-settings", guildSettingsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;