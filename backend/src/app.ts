import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const DEFAULT_GOOGLE_CLIENT_ID =
  "625073924200-4lfk3mfgpokq2j41h5aa2l32m2e4u4qs.apps.googleusercontent.com";
const effectiveGoogleClientId =
  process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

if (!effectiveGoogleClientId) {
  throw new Error("Missing GOOGLE_CLIENT_ID in backend .env");
}

const googleClient = new OAuth2Client(effectiveGoogleClientId);
const prisma = new PrismaClient();
const app = express();

const CONTACT_RECIPIENT_EMAIL = "alikcn35@gmail.com";
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@taskflow.local";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com";

const GEMINI_API_VERSIONS = ["v1beta", "v1"] as const;
const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

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

type ContactRequestPayload = {
  fullName: string;
  email: string;
  phone: string;
  requestType: string;
  company: string;
  message: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeLine(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateContactPayload(body: Record<string, unknown>) {
  const fullName = sanitizeLine(body.fullName);
  const email = sanitizeLine(body.email);
  const phone = sanitizeLine(body.phone);
  const requestType = sanitizeLine(body.requestType);
  const company = sanitizeLine(body.company);
  const message = sanitizeLine(body.message);
  const errors: string[] = [];

  if (!fullName) errors.push("fullName is required");
  if (!email) errors.push("email is required");
  if (email && !isValidEmail(email)) errors.push("email is invalid");
  if (!phone) errors.push("phone is required");
  if (!requestType) errors.push("requestType is required");
  if (!message) errors.push("message is required");

  return {
    payload: {
      fullName,
      email,
      phone,
      requestType,
      company,
      message,
    } as ContactRequestPayload,
    errors,
  };
}

function mapRequestTypeLabel(requestType: string) {
  switch (requestType) {
    case "guncelleme":
      return "Guncelleme talebi";
    case "yenilik":
      return "Yenilik talebi";
    case "istek":
      return "Istek";
    case "sikayet":
      return "Sikayet";
    default:
      return requestType;
  }
}

type AiRefineField = "title" | "description";

function buildAiPrompt(field: AiRefineField, text: string) {
  const goal =
    field === "title"
      ? "Bu gorev basligini daha net, kisa ve profesyonel hale getir."
      : "Bu gorev aciklamasini daha anlasilir, duzenli ve profesyonel hale getir.";

  return [
    "Sen bir Turkce is yazimi duzenleyicisisin.",
    goal,
    "Anlami koru, yeni bilgi ekleme.",
    "Sadece duzenlenmis metni don. Aciklama veya etiket ekleme.",
    "",
    "Metin:",
    text,
  ].join("\n");
}

async function refineTextWithGemini(text: string, field: AiRefineField) {
  if (!GEMINI_API_KEY) {
    throw new Error("AI servisi aktif degil. GEMINI_API_KEY tanimlayin.");
  }

  const normalizeModelName = (modelName: string) =>
    modelName.replace(/^models\//, "").trim();

  const preferredModels = [
    GEMINI_MODEL ? normalizeModelName(GEMINI_MODEL) : "",
    ...GEMINI_FALLBACK_MODELS,
  ].filter((modelName, index, arr) => modelName && arr.indexOf(modelName) === index);

  const getAvailableModelNames = async (apiVersion: "v1beta" | "v1") => {
    try {
      const listResponse = await fetch(
        `${GEMINI_API_BASE}/${apiVersion}/models?key=${GEMINI_API_KEY}`,
      );
      const listPayload = (await listResponse.json().catch(() => null)) as
        | {
            models?: Array<{
              name?: string;
              supportedGenerationMethods?: string[];
            }>;
          }
        | null;

      if (!listResponse.ok || !listPayload?.models?.length) {
        return [] as string[];
      }

      return listPayload.models
        .filter((model) =>
          (model.supportedGenerationMethods || []).includes("generateContent"),
        )
        .map((model) => normalizeModelName(model.name || ""))
        .filter(Boolean);
    } catch {
      return [] as string[];
    }
  };

  let lastErrorMessage = "AI duzenleme servisine erisilemedi.";

  for (const apiVersion of GEMINI_API_VERSIONS) {
    const availableModels = await getAvailableModelNames(apiVersion);
    const candidateModels =
      availableModels.length > 0
        ? [
            ...preferredModels.filter((modelName) => availableModels.includes(modelName)),
            ...availableModels.filter((modelName) =>
              /flash/i.test(modelName),
            ),
            ...availableModels,
          ].filter((modelName, index, arr) => arr.indexOf(modelName) === index)
        : preferredModels;

    for (const modelName of candidateModels) {
      const response = await fetch(
        `${GEMINI_API_BASE}/${apiVersion}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: buildAiPrompt(field, text) }],
              },
            ],
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 220,
            },
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as any;

      if (response.ok) {
        const refined = payload?.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part?.text || "")
          .join("\n")
          .trim();

        if (!refined) {
          throw new Error("AI duzenleme sonucu alinamadi.");
        }

        return refined.replace(/^"|"$/g, "").trim();
      }

      const message = payload?.error?.message || "AI duzenleme servisine erisilemedi.";
      lastErrorMessage = message;

      const isModelUnavailable =
        response.status === 404 ||
        /not found|not supported|unsupported|unknown model/i.test(String(message));

      if (isModelUnavailable) {
        continue;
      }

      throw new Error(message);
    }
  }

  throw new Error(
    `Uygun Gemini modeli bulunamadi. Son hata: ${lastErrorMessage}. GEMINI_MODEL degerini guncel bir modelle ayarlayin (ornek: gemini-2.5-flash).`,
  );
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

app.post(["/ai/refine-text", "/api/ai/refine-text"], authenticate, async (req, res) => {
  const rawText = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const field = req.body?.field as AiRefineField;

  if (!rawText) {
    return res.status(400).json({ error: "text is required" });
  }

  if (field !== "title" && field !== "description") {
    return res.status(400).json({ error: "field must be title or description" });
  }

  if (rawText.length > 4000) {
    return res.status(400).json({ error: "text is too long" });
  }

  try {
    const refinedText = await refineTextWithGemini(rawText, field);
    res.status(200).json({ text: refinedText });
  } catch (error) {
    console.error("AI refine failed", error);
    const message = error instanceof Error ? error.message : "AI duzenleme hatasi";
    const status = /GEMINI_API_KEY/.test(message) ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

app.post(["/contact-requests", "/api/contact-requests"], async (req, res) => {
  const { payload, errors } = validateContactPayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !Number.isFinite(SMTP_PORT)) {
    return res.status(503).json({
      error:
        "Mail servisi hazir degil. SMTP ayarlarini backend ortam degiskenlerinde tanimlayin.",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const requestTypeLabel = mapRequestTypeLabel(payload.requestType);
    const subject = `TaskFlow talep formu - ${requestTypeLabel} - ${payload.fullName}`;
    const companyLabel = payload.company || "Belirtilmedi";

    const text = [
      "TaskFlow iletisim formundan yeni bir talep geldi.",
      "",
      `Ad Soyad: ${payload.fullName}`,
      `E-posta: ${payload.email}`,
      `Telefon: ${payload.phone}`,
      `Talep Turu: ${requestTypeLabel}`,
      `Sirket: ${companyLabel}`,
      "",
      "Mesaj:",
      payload.message,
    ].join("\n");

    await transporter.sendMail({
      from: SMTP_FROM,
      to: CONTACT_RECIPIENT_EMAIL,
      replyTo: payload.email,
      subject,
      text,
    });

    res.status(202).json({ success: true });
  } catch (error) {
    console.error("Contact request email failed", error);
    res.status(500).json({ error: "Talep iletilemedi. Lutfen tekrar deneyin." });
  }
});

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