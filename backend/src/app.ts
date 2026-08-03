import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const DEFAULT_GOOGLE_CLIENT_ID =
  "625073924200-4lfk3mfgpokq2j41h5aa2l32m2e4u4qs.apps.googleusercontent.com";
const effectiveGoogleClientId = DEFAULT_GOOGLE_CLIENT_ID;

if (!effectiveGoogleClientId) {
  throw new Error("Missing GOOGLE_CLIENT_ID in backend .env");
}

const googleClient = new OAuth2Client(effectiveGoogleClientId);
const prisma = new PrismaClient();
const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(express.json());

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        email: string;
        name?: string;
        picture?: string;
      };
    }
  }
}

async function verifyGoogleToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: effectiveGoogleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || payload.email_verified !== true) {
    throw new Error("Unauthorized");
  }

  return {
    email: payload.email,
    name: payload.name ?? undefined,
    picture: payload.picture ?? undefined,
  };
}

const authenticate = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const authHeader = req.header("authorization") || req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  try {
    req.authUser = await verifyGoogleToken(token);
    next();
  } catch (error) {
    console.error("Authentication failed", error);
    res.status(401).json({ error: "Unauthorized" });
  }
};

const allowedPriorities = ["Acil", "Yüksek", "Orta", "Düşük"];
const allowedStatuses = ["Yapılacak", "Tamamlandı"];

function validateTaskPayload(body: Record<string, unknown>) {
  const errors: string[] = [];
  const requiredString = (value: unknown, field: string) => {
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${field} is required`);
      return "";
    }
    return value.trim();
  };

  const title = requiredString(body.title, "title");
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const priority =
    typeof body.priority === "string" && allowedPriorities.includes(body.priority)
      ? body.priority
      : "Orta";
  const status =
    typeof body.status === "string" && allowedStatuses.includes(body.status)
      ? body.status
      : "Yapılacak";

  return {
    title,
    vehicle: "",
    customer: "",
    area: "",
    responsible: "",
    description,
    priority,
    status,
    errors,
  };
}

function validateTaskUpdatePayload(body: Record<string, unknown>) {
  const errors: string[] = [];
  const updateData: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    if (typeof body.title === "string" && body.title.trim()) {
      updateData.title = body.title.trim();
    } else {
      errors.push("title is required");
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    if (typeof body.description === "string") {
      updateData.description = body.description.trim();
    } else {
      errors.push("description must be a string");
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "priority")) {
    if (typeof body.priority === "string" && allowedPriorities.includes(body.priority)) {
      updateData.priority = body.priority;
    } else {
      errors.push("Invalid priority");
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    if (typeof body.status === "string" && allowedStatuses.includes(body.status)) {
      updateData.status = body.status;
    } else {
      errors.push("Invalid status");
    }
  }

  return { updateData, errors };
}

const tasksRouter = express.Router();

tasksRouter.get("/", async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { ownerEmail: req.authUser!.email } as any,
    orderBy: { priority: "asc" },
  });
  res.json(tasks);
});

tasksRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.ownerEmail !== req.authUser!.email) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json(task);
});

tasksRouter.post("/", async (req, res) => {
  const payload = validateTaskPayload(req.body);
  if (payload.errors.length > 0) {
    return res.status(400).json({ error: payload.errors.join(", ") });
  }

  const task = await prisma.task.create({
    data: {
      title: payload.title,
      vehicle: payload.vehicle,
      customer: payload.customer,
      area: payload.area,
      responsible: payload.responsible,
      description: payload.description,
      priority: payload.priority,
      status: payload.status,
      ownerEmail: req.authUser!.email,
    },
  });
  res.status(201).json(task);
});

tasksRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const existingTask = await prisma.task.findUnique({ where: { id } });
  if (!existingTask || existingTask.ownerEmail !== req.authUser!.email) {
    return res.status(404).json({ error: "Not found" });
  }

  const { updateData, errors } = validateTaskUpdatePayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No valid fields provided for update" });
  }

  const task = await prisma.task.update({ where: { id }, data: updateData as any });
  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const existingTask = await prisma.task.findUnique({ where: { id } });
  if (!existingTask || existingTask.ownerEmail !== req.authUser!.email) {
    return res.status(404).json({ error: "Not found" });
  }

  await prisma.task.delete({ where: { id } });
  res.status(204).end();
});

app.use("/tasks", authenticate, tasksRouter);
app.use("/api/tasks", authenticate, tasksRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/db-health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const taskCount = await prisma.task.count();
    res.status(200).json({ status: "ok", db: "connected", taskCount });
  } catch (error) {
    console.error("DB health check failed", error);
    res.status(500).json({ status: "error", db: "unavailable" });
  }
});

app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error", error);
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;