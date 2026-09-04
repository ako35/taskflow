import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const DEFAULT_GOOGLE_CLIENT_ID =
  "625073924200-3m8cpgu35qtc2mf1jnfg9aet24verhqk.apps.googleusercontent.com";
const effectiveGoogleClientId =
  process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

if (!effectiveGoogleClientId) {
  throw new Error("Missing GOOGLE_CLIENT_ID in backend .env");
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in backend .env");
}

// Mobil (iOS/Android/Expo) istemcileri web'den farklı OAuth client ID kullanır;
// Google her client ID için ayrı bir "aud" claim'i olan idToken üretir, bu yüzden
// hepsi kabul edilebilir audience listesine eklenmeli.
const googleAudiences = [
  effectiveGoogleClientId,
  process.env.GOOGLE_IOS_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  process.env.GOOGLE_EXPO_CLIENT_ID,
].filter((value): value is string => Boolean(value));

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
// Vercel Cron istekleri bu değeri "Authorization: Bearer <CRON_SECRET>" olarak
// gönderir. Ayarlı değilse cron endpoint'i 503 döner (kazara açık kalmasın).
const CRON_SECRET = process.env.CRON_SECRET;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com";

const GEMINI_API_VERSIONS = ["v1beta", "v1"] as const;
const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const DEFAULT_WORKSPACE_COLOR = "#5b8cff";
const DEFAULT_WORKSPACE_ICON = "compass";
const INVITATION_EXPIRY_DAYS = 7;

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
].filter(Boolean);

const notificationsRouter = express.Router();

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
    audience: googleAudiences,
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

// TaskFlow'un kendi e-posta/sifre girisleri icin urettigi JWT'ler Google
// idToken'i ile ayni "Bearer" header'indan gecer; hangi dogrulayiciyi
// kullanacagimizi `iss` claim'ine bakarak ayirt ediyoruz.
function signAppToken(profile: {
  authEmail: string;
  firstName: string;
  lastName: string | null;
  picture: string | null;
}) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.firstName;

  return jwt.sign(
    {
      email: profile.authEmail,
      name,
      given_name: profile.firstName,
      family_name: profile.lastName ?? undefined,
      picture: profile.picture ?? undefined,
    },
    JWT_SECRET as string,
    { expiresIn: "30d" },
  );
}

async function verifyRequestToken(token: string) {
  const decoded = jwt.decode(token, { complete: true }) as { payload?: Record<string, unknown> } | null;
  const issuer = decoded?.payload?.iss;

  if (typeof issuer === "string" && issuer.includes("accounts.google.com")) {
    return verifyGoogleToken(token);
  }

  const payload = jwt.verify(token, JWT_SECRET as string) as jwt.JwtPayload;
  if (!payload.email || typeof payload.email !== "string") {
    throw new Error("Unauthorized");
  }

  return {
    email: payload.email,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
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
    req.authUser = await verifyRequestToken(token);
    next();
  } catch (error) {
    console.error("Authentication failed", error);
    res.status(401).json({ error: "Unauthorized" });
  }
};

const allowedPriorities = ["Acil", "Yüksek", "Orta", "Düşük"];
const allowedStatuses = ["Yapılacak", "Tamamlandı"];

type WorkspaceRole = "OWNER" | "MEMBER";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function canonicalizeEmailForInvite(value: string) {
  const normalized = normalizeEmail(value);
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0) {
    return normalized;
  }

  const localPart = normalized.slice(0, atIndex);
  const domainPart = normalized.slice(atIndex + 1);

  // Gmail addresses ignore dots and anything after '+'.
  if (domainPart === "gmail.com" || domainPart === "googlemail.com") {
    const canonicalLocal = localPart.split("+")[0].replace(/\./g, "");
    return `${canonicalLocal}@gmail.com`;
  }

  return normalized;
}

function parseOptionalReminder(value: unknown, errors: string[]) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    errors.push("remindAt must be an ISO date string or null");
    return null;
  }

  const remindAt = new Date(value);
  if (Number.isNaN(remindAt.getTime())) {
    errors.push("Invalid remindAt date");
    return null;
  }

  return remindAt;
}

function parseOptionalAssigneeId(value: unknown, errors: string[]): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    errors.push("assigneeId geçersiz");
    return null;
  }

  return parsed;
}

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
  const workspaceId = requiredString(body.workspaceId, "workspaceId");
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const priority =
    typeof body.priority === "string" && allowedPriorities.includes(body.priority)
      ? body.priority
      : "Orta";
  const status =
    typeof body.status === "string" && allowedStatuses.includes(body.status)
      ? body.status
      : "Yapılacak";
  const remindAt = parseOptionalReminder(body.remindAt, errors);
  const assigneeId = parseOptionalAssigneeId(body.assigneeId, errors);

  return {
    title,
    workspaceId,
    vehicle: "",
    customer: "",
    area: "",
    responsible: "",
    description,
    priority,
    status,
    remindAt,
    assigneeId,
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

  if (Object.prototype.hasOwnProperty.call(body, "assigneeDone")) {
    if (typeof body.assigneeDone === "boolean") {
      updateData.assigneeDone = body.assigneeDone;
    } else {
      errors.push("assigneeDone must be a boolean");
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "remindAt")) {
    updateData.remindAt = parseOptionalReminder(body.remindAt, errors);
  }

  if (Object.prototype.hasOwnProperty.call(body, "assigneeId")) {
    updateData.assigneeId = parseOptionalAssigneeId(body.assigneeId, errors);
  }

  return { updateData, errors };
}

function validateTaskCommentPayload(body: Record<string, unknown>) {
  const content = sanitizeMultiline(body.content);
  const errors: string[] = [];

  if (!content) {
    errors.push("content is required");
  }

  if (content.length > 2000) {
    errors.push("content must be 2000 characters or fewer");
  }

  return {
    payload: {
      content,
    },
    errors,
  };
}

function splitFullName(fullName?: string) {
  const normalized = (fullName || "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return {
      firstName: "Kullanici",
      lastName: null as string | null,
    };
  }

  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: null as string | null,
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function validateProfilePayload(body: Record<string, unknown>) {
  const errors: string[] = [];
  const firstName = sanitizeLine(body.firstName);
  const lastName = sanitizeLine(body.lastName);
  const email = sanitizeLine(body.email);
  const phone = sanitizeLine(body.phone);

  if (!firstName) {
    errors.push("firstName is required");
  }

  if (!email) {
    errors.push("email is required");
  } else if (!isValidEmail(email)) {
    errors.push("email is invalid");
  }

  return {
    payload: {
      firstName,
      lastName: lastName || null,
      email,
      phone: phone || null,
    },
    errors,
  };
}

async function upsertUserProfile(authUser: NonNullable<express.Request["authUser"]>) {
  const normalizedAuthEmail = normalizeEmail(authUser.email);

  const existingProfile = await prisma.userProfile.findUnique({
    where: {
      authEmail: normalizedAuthEmail,
    },
  });

  if (existingProfile) {
    if (authUser.picture && authUser.picture !== existingProfile.picture) {
      return prisma.userProfile.update({
        where: {
          id: existingProfile.id,
        },
        data: {
          picture: authUser.picture,
        },
      });
    }

    return existingProfile;
  }

  const { firstName, lastName } = splitFullName(authUser.name);

  return prisma.userProfile.create({
    data: {
      authEmail: normalizedAuthEmail,
      firstName,
      lastName,
      email: normalizedAuthEmail,
      picture: authUser.picture,
    },
  });
}

async function ensureDefaultWorkspaceForUser(userProfileId: number) {
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: {
      userProfileId,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existingMembership) {
    return existingMembership.workspace;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: "Genel",
      color: DEFAULT_WORKSPACE_COLOR,
      icon: DEFAULT_WORKSPACE_ICON,
      createdByUserId: userProfileId,
      members: {
        create: {
          userProfileId,
          role: "OWNER",
        },
      },
    },
  });

  return workspace;
}

async function getWorkspaceMember(userProfileId: number, workspaceId: string) {
  return prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userProfileId: {
        workspaceId,
        userProfileId,
      },
    },
  });
}

// Görev yanıtlarında atanan kişiyi küçük bir şekille döndür.
const taskInclude = {
  assignee: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

function displayName(profile: {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  authEmail?: string | null;
}) {
  return (
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    profile.email ||
    profile.authEmail ||
    "Bir kullanıcı"
  );
}

// Bir kullanıcının görebildiği tek görevi getirir (üyelik + rol bazlı görünürlük).
async function findVisibleTask(taskId: number, profileId: number) {
  const found = await prisma.task.findFirst({
    where: {
      id: taskId,
      workspace: { members: { some: { userProfileId: profileId } } },
    },
    include: { ...taskInclude, workspace: { select: { type: true } } },
  });

  if (!found) {
    return { task: null as null, membership: null as null, workspaceType: null as null };
  }

  const { workspace, ...task } = found;

  const membership = await getWorkspaceMember(profileId, task.workspaceId);
  if (!membership) {
    return { task: null as null, membership: null as null, workspaceType: null as null };
  }

  if (
    membership.role !== "OWNER" &&
    workspace.type === "TASKS" &&
    task.assigneeId !== profileId
  ) {
    return { task: null as null, membership: null as null, workspaceType: null as null };
  }

  return { task, membership, workspaceType: workspace.type };
}

// Atama bildirimi: yeni atanan kişiye (kendine atama hariç).
async function notifyAssignment(
  task: { id: number; title: string; workspaceId: string },
  assigneeId: number,
  actor: { id: number; firstName: string; lastName?: string | null; email?: string | null; authEmail?: string | null },
) {
  if (assigneeId === actor.id) {
    return;
  }

  const actorName = displayName(actor);
  await prisma.notification.create({
    data: {
      userProfileId: assigneeId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      type: "assignment",
      message: `${actorName} sana "${task.title}" görevini atadı.`,
    },
  });
  await sendPushNotifications(
    [assigneeId],
    "Yeni görev",
    `${actorName} sana "${task.title}" görevini atadı.`,
    { type: "assignment", taskId: task.id },
  );
}

// Tamamlama bildirimi: atanan üye görevi "Bitirdim" işaretleyince çalışma alanı
// sahiplerine (actor hariç).
async function notifyAssigneeDoneToOwners(
  task: { id: number; title: string; workspaceId: string },
  actor: { id: number; firstName: string; lastName?: string | null; email?: string | null; authEmail?: string | null },
) {
  const owners = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: task.workspaceId,
      role: "OWNER",
      userProfileId: { not: actor.id },
    },
    select: { userProfileId: true },
  });

  if (owners.length === 0) {
    return;
  }

  const actorName = displayName(actor);
  const message = `${actorName} "${task.title}" görevini bitirdi olarak işaretledi.`;
  const ownerIds = owners.map((owner) => owner.userProfileId);

  await prisma.notification.createMany({
    data: ownerIds.map((userProfileId) => ({
      userProfileId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      type: "status",
      message,
    })),
  });
  await sendPushNotifications(ownerIds, "Görev tamamlandı işaretlendi", message, {
    type: "status",
    taskId: task.id,
  });
}

type ContactRequestPayload = {
  fullName: string;
  email: string;
  phone: string;
  requestType: string;
  company: string;
  message: string;
};

type InvitationPayload = {
  inviteeEmail: string;
  message: string;
  workspaceId: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeLine(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeMultiline(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateWorkspacePayload(body: Record<string, unknown>) {
  const name = sanitizeLine(body.name);
  const color = sanitizeLine(body.color) || DEFAULT_WORKSPACE_COLOR;
  const icon = sanitizeLine(body.icon) || DEFAULT_WORKSPACE_ICON;
  const type = sanitizeLine(body.type) || "TASKS";
  const errors: string[] = [];

  if (!name) {
    errors.push("name is required");
  }

  if (type !== "TASKS" && type !== "KNOWLEDGE") {
    errors.push("type must be TASKS or KNOWLEDGE");
  }

  return {
    payload: {
      name,
      color,
      icon,
      type,
    },
    errors,
  };
}

function validateInvitationPayload(body: Record<string, unknown>) {
  const inviteeEmail = sanitizeLine(body.inviteeEmail);
  const message = sanitizeMultiline(body.message);
  const workspaceId = sanitizeLine(body.workspaceId);
  const errors: string[] = [];

  if (!inviteeEmail) errors.push("inviteeEmail is required");
  if (inviteeEmail && !isValidEmail(inviteeEmail)) {
    errors.push("inviteeEmail is invalid");
  }
  if (!workspaceId) {
    errors.push("workspaceId is required");
  }
  if (message.length > 500) {
    errors.push("message must be 500 characters or fewer");
  }

  return {
    payload: {
      inviteeEmail,
      message,
      workspaceId,
    } as InvitationPayload,
    errors,
  };
}

function validateInvitationAcceptPayload(body: Record<string, unknown>) {
  const token = sanitizeLine(body.token);
  const errors: string[] = [];

  if (!token) {
    errors.push("token is required");
  }

  return {
    payload: { token },
    errors,
  };
}

function resolveAppBaseUrl(originHeader?: string) {
  const allowedOrigin = typeof originHeader === "string" ? originHeader.trim() : "";
  if (allowedOrigin && allowedOrigins.includes(allowedOrigin)) {
    return allowedOrigin;
  }

  const fallbackBaseUrl =
    process.env.FRONTEND_URL || allowedOrigins[0] || "http://localhost:5173";
  return fallbackBaseUrl.replace(/\/$/, "");
}

function buildInviteLink(baseUrl: string, token: string) {
  // Davet linki "/indir" karşılama sayfasına gider: mobil uygulama indirme +
  // kurulum adımları + "tarayıcıda kabul et" seçeneği hepsi orada.
  return `${baseUrl}/indir?inviteToken=${encodeURIComponent(token)}`;
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
              maxOutputTokens: 2048,
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
const profileRouter = express.Router();
const workspacesRouter = express.Router();
const pushTokensRouter = express.Router();

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN;

async function sendPushNotifications(
  userProfileIds: number[],
  title: string,
  body: string,
  data: Record<string, unknown>,
) {
  if (userProfileIds.length === 0) {
    return;
  }

  const tokens = await prisma.pushToken.findMany({
    where: { userProfileId: { in: userProfileIds } },
    select: { token: true, userProfileId: true },
  });

  if (tokens.length === 0) {
    return;
  }

  // App ikonu üzerindeki rozet, her kullanıcının kendi okunmamış bildirim
  // sayısını gösterir (iOS bunu payload'dan otomatik uygular; Android tarafında
  // uygulama açılışında setBadgeCountAsync ile senkronlanır).
  const unreadGroups = await prisma.notification.groupBy({
    by: ["userProfileId"],
    where: { userProfileId: { in: userProfileIds }, isRead: false },
    _count: true,
  });
  const unreadByUser = new Map(
    unreadGroups.map((group) => [group.userProfileId, group._count]),
  );

  const messages = tokens.map((item) => ({
    to: item.token,
    title,
    body,
    sound: "default",
    priority: "high",
    channelId: "default",
    badge: unreadByUser.get(item.userProfileId) ?? 1,
    data,
  }));

  try {
    await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error("Push notification send failed", error);
  }
}

function validatePushTokenPayload(body: Record<string, unknown>) {
  const token = sanitizeLine(body.token);
  const errors: string[] = [];

  if (!token) {
    errors.push("token is required");
  }

  return { token, errors };
}

pushTokensRouter.post("/", async (req, res) => {
  const { token, errors } = validatePushTokenPayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const profile = await upsertUserProfile(req.authUser!);

  await prisma.pushToken.upsert({
    where: { token },
    update: { userProfileId: profile.id },
    create: { token, userProfileId: profile.id },
  });

  res.status(204).end();
});

pushTokensRouter.delete("/", async (req, res) => {
  const { token, errors } = validatePushTokenPayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const profile = await upsertUserProfile(req.authUser!);

  await prisma.pushToken.deleteMany({
    where: { token, userProfileId: profile.id },
  });

  res.status(204).end();
});

// Hatırlatıcı taraması GET /notifications içinden tetikleniyor ama bu zaman
// damgasıyla throttle'lanıyor: warm instance başına en fazla
// REMINDER_SWEEP_MIN_INTERVAL_MS aralıkla. Böylece her istek ağır bir
// $transaction çalıştırmıyor. Harici bir cron /api/cron/reminders'ı çağırarak
// bunu kullanıcıdan bağımsız da tetikleyebilir (CRON_SECRET ile).
const REMINDER_SWEEP_MIN_INTERVAL_MS = 60_000;
let lastReminderSweepAt = 0;

async function createDueReminderNotifications() {
  lastReminderSweepAt = Date.now();
  const now = new Date();
  const remindersToPush: { taskId: number; title: string; memberIds: number[] }[] = [];
  let createdCount = 0;

  await prisma.$transaction(async (transaction) => {
    const dueTasks = await transaction.task.findMany({
      where: {
        remindAt: { lte: now },
        reminderNotifiedAt: null,
      },
      orderBy: { remindAt: "asc" },
      take: 50,
      select: {
        id: true,
        title: true,
        workspaceId: true,
        assigneeId: true,
      },
    });

    for (const task of dueTasks) {
      const claimed = await transaction.task.updateMany({
        where: {
          id: task.id,
          reminderNotifiedAt: null,
        },
        data: {
          reminderNotifiedAt: now,
        },
      });

      if (claimed.count === 0) {
        continue;
      }

      // Hatırlatıcı yalnızca çalışma alanı sahiplerine ve göreve atanan üyeye
      // gider; atanmamış üyeler başkasının görevi için bildirim almaz.
      const owners = await transaction.workspaceMember.findMany({
        where: { workspaceId: task.workspaceId, role: "OWNER" },
        select: { userProfileId: true },
      });

      const recipientIds = [...new Set(owners.map((owner) => owner.userProfileId))];
      if (task.assigneeId && !recipientIds.includes(task.assigneeId)) {
        recipientIds.push(task.assigneeId);
      }

      if (recipientIds.length > 0) {
        const created = await transaction.notification.createMany({
          data: recipientIds.map((userProfileId) => ({
            userProfileId,
            workspaceId: task.workspaceId,
            taskId: task.id,
            commentId: null,
            type: "reminder",
            message: `Hatırlatıcı: "${task.title}" görevinin zamanı geldi.`,
          })),
        });
        createdCount += created.count;
        remindersToPush.push({
          taskId: task.id,
          title: task.title,
          memberIds: recipientIds,
        });
      }
    }
  });

  for (const reminder of remindersToPush) {
    await sendPushNotifications(
      reminder.memberIds,
      "Hatırlatıcı",
      `"${reminder.title}" görevinin zamanı geldi.`,
      { type: "reminder", taskId: reminder.taskId },
    );
  }

  return createdCount;
}

function toSafeProfile<T extends { passwordHash: string | null }>(profile: T) {
  const { passwordHash, ...safeProfile } = profile;
  return safeProfile;
}

profileRouter.get("/", async (req, res) => {
  const profile = await upsertUserProfile(req.authUser!);
  await ensureDefaultWorkspaceForUser(profile.id);
  res.json(toSafeProfile(profile));
});

profileRouter.put("/", async (req, res) => {
  const { payload, errors } = validateProfilePayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const existingProfile = await upsertUserProfile(req.authUser!);
  const profile = await prisma.userProfile.update({
    where: {
      id: existingProfile.id,
    },
    data: payload,
  });

  res.json(toSafeProfile(profile));
});

notificationsRouter.get("/", async (req, res) => {
  const profile = await upsertUserProfile(req.authUser!);
  // Yedek tarama: cron kaçmışsa ve son taramadan bu yana yeterince zaman
  // geçmişse çalıştır. Normalde bu adım atlanır ve endpoint sadece iki
  // indeksli sorgu yapar.
  if (Date.now() - lastReminderSweepAt > REMINDER_SWEEP_MIN_INTERVAL_MS) {
    await createDueReminderNotifications();
  }
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(50, Math.floor(rawLimit)))
    : 20;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userProfileId: profile.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        message: true,
        type: true,
        isRead: true,
        createdAt: true,
        workspaceId: true,
        taskId: true,
      },
    }),
    prisma.notification.count({
      where: {
        userProfileId: profile.id,
        isRead: false,
      },
    }),
  ]);

  res.json({
    unreadCount,
    items: items.map((item) => ({
      id: item.id,
      message: item.message,
      type: item.type,
      isRead: item.isRead,
      createdAt: item.createdAt,
      workspaceId: item.workspaceId,
      taskId: item.taskId,
    })),
  });
});

notificationsRouter.post("/read-all", async (req, res) => {
  const profile = await upsertUserProfile(req.authUser!);

  await prisma.notification.updateMany({
    where: {
      userProfileId: profile.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  res.status(204).end();
});

notificationsRouter.post("/:id/read", async (req, res) => {
  const profile = await upsertUserProfile(req.authUser!);
  const notificationId = Number(req.params.id);

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    res.status(400).json({ error: "Gecersiz bildirim kimligi." });
    return;
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userProfileId: profile.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  res.status(204).end();
});

workspacesRouter.get("/", async (req, res) => {
  const profile = await upsertUserProfile(req.authUser!);
  await ensureDefaultWorkspaceForUser(profile.id);

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userProfileId: profile.id,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const workspaces = memberships.map((membership) => ({
    id: membership.workspace.id,
    name: membership.workspace.name,
    type: membership.workspace.type,
    color: membership.workspace.color,
    icon: membership.workspace.icon,
    role: membership.role,
  }));

  res.json(workspaces);
});

workspacesRouter.get("/:id/members", async (req, res) => {
  const workspaceId = sanitizeLine(req.params.id);
  if (!workspaceId) {
    return res.status(400).json({ error: "workspace id is required" });
  }

  const profile = await upsertUserProfile(req.authUser!);
  const membership = await getWorkspaceMember(profile.id, workspaceId);
  if (!membership) {
    return res.status(403).json({ error: "Bu calisma alanina erisiminiz yok." });
  }

  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
    },
    include: {
      userProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  });

  res.json(
    members.map((item) => ({
      id: item.userProfile.id,
      firstName: item.userProfile.firstName,
      lastName: item.userProfile.lastName,
      email: item.userProfile.email,
      role: item.role,
    })),
  );
});

workspacesRouter.delete("/:id/members/:memberUserId", async (req, res) => {
  const workspaceId = sanitizeLine(req.params.id);
  if (!workspaceId) {
    return res.status(400).json({ error: "workspace id is required" });
  }

  const memberUserId = Number(req.params.memberUserId);
  if (Number.isNaN(memberUserId)) {
    return res.status(400).json({ error: "member user id is invalid" });
  }

  const profile = await upsertUserProfile(req.authUser!);
  const membership = await getWorkspaceMember(profile.id, workspaceId);
  if (!membership) {
    return res.status(403).json({ error: "Bu calisma alanina erisiminiz yok." });
  }

  if (membership.role !== "OWNER") {
    return res
      .status(403)
      .json({ error: "Uye cikarma islemini sadece calisma alani sahibi yapabilir." });
  }

  if (memberUserId === profile.id) {
    return res.status(400).json({ error: "Kendinizi bu alandan cikarmazsiniz." });
  }

  const targetMembership = await getWorkspaceMember(memberUserId, workspaceId);
  if (!targetMembership) {
    return res.status(404).json({ error: "Cikarilacak uye bulunamadi." });
  }

  if (targetMembership.role === "OWNER") {
    return res.status(400).json({ error: "Calisma alani sahibi cikarilamaz." });
  }

  await prisma.workspaceMember.delete({
    where: {
      workspaceId_userProfileId: {
        workspaceId,
        userProfileId: memberUserId,
      },
    },
  });

  res.status(204).end();
});

workspacesRouter.get("/:id/invitations", async (req, res) => {
  const workspaceId = sanitizeLine(req.params.id);
  if (!workspaceId) {
    return res.status(400).json({ error: "workspace id is required" });
  }

  const profile = await upsertUserProfile(req.authUser!);
  const membership = await getWorkspaceMember(profile.id, workspaceId);
  if (!membership) {
    return res.status(403).json({ error: "Bu calisma alanina erisiminiz yok." });
  }

  const [invitations, workspaceMembers] = await Promise.all([
    prisma.invitation.findMany({
      where: {
        workspaceId,
      },
      select: {
        id: true,
        invitedEmail: true,
        status: true,
        createdAt: true,
        acceptedAt: true,
        acceptedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      select: {
        role: true,
        createdAt: true,
        userProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const currentMemberIds = new Set(
    workspaceMembers.map((membership) => membership.userProfile.id),
  );

  const acceptedByAccount = new Map<
    string,
    {
      id: string;
      userProfileId: number | null;
      email: string;
      firstName: string | null;
      lastName: string | null;
      invitedAt: Date;
      acceptedAt: Date | null;
    }
  >();

  invitations
    .filter((invite) => invite.status === "ACCEPTED")
    .forEach((invite) => {
      const email = invite.acceptedBy?.email || invite.invitedEmail;
      const accountKey =
        invite.acceptedBy?.id != null
          ? `user:${invite.acceptedBy.id}`
          : `email:${canonicalizeEmailForInvite(email)}`;

      const existing = acceptedByAccount.get(accountKey);
      const inviteTime = (invite.acceptedAt || invite.createdAt).getTime();
      const existingTime = existing
        ? (existing.acceptedAt || existing.invitedAt).getTime()
        : -1;

      if (!existing || inviteTime > existingTime) {
        acceptedByAccount.set(accountKey, {
          id: invite.id,
          userProfileId: invite.acceptedBy?.id || null,
          email,
          firstName: invite.acceptedBy?.firstName || null,
          lastName: invite.acceptedBy?.lastName || null,
          invitedAt: invite.createdAt,
          acceptedAt: invite.acceptedAt || null,
        });
      }
    });

  workspaceMembers
    .filter((membership) => membership.role === "MEMBER")
    .forEach((membership) => {
      const accountKey = `user:${membership.userProfile.id}`;
      const membershipEmailKey = canonicalizeEmailForInvite(
        membership.userProfile.email,
      );
      const legacyEntry = Array.from(acceptedByAccount.entries()).find(
        ([, invite]) =>
          canonicalizeEmailForInvite(invite.email) === membershipEmailKey,
      );
      const existing = acceptedByAccount.get(accountKey) || legacyEntry?.[1];

      if (legacyEntry && legacyEntry[0] !== accountKey) {
        acceptedByAccount.delete(legacyEntry[0]);
      }

      acceptedByAccount.set(accountKey, {
        id: existing?.id || `member:${membership.userProfile.id}`,
        userProfileId: membership.userProfile.id,
        email: membership.userProfile.email,
        firstName: membership.userProfile.firstName,
        lastName: membership.userProfile.lastName,
        invitedAt: existing?.invitedAt || membership.createdAt,
        acceptedAt: existing?.acceptedAt || membership.createdAt,
      });
    });

  // Drop stale ACCEPTED-invitation entries for users whose membership was
  // since removed, so a removed member disappears from the list instead of
  // lingering forever (invitation status itself is never reverted).
  const acceptedValues = Array.from(acceptedByAccount.values()).filter(
    (entry) => entry.userProfileId == null || currentMemberIds.has(entry.userProfileId),
  );

  const acceptedEmailKeys = new Set(
    acceptedValues.map((invite) => canonicalizeEmailForInvite(invite.email)),
  );

  const pendingByAccount = new Map<
    string,
    {
      id: string;
      email: string;
      firstName: null;
      lastName: null;
      invitedAt: Date;
      acceptedAt: null;
    }
  >();

  invitations
    .filter((invite) => invite.status === "PENDING")
    .forEach((invite) => {
      const emailKey = canonicalizeEmailForInvite(invite.invitedEmail);

      // If same account already accepted an invite, do not keep it in pending.
      if (acceptedEmailKeys.has(emailKey)) {
        return;
      }

      const accountKey = `email:${emailKey}`;
      const existing = pendingByAccount.get(accountKey);
      const inviteTime = invite.createdAt.getTime();
      const existingTime = existing ? existing.invitedAt.getTime() : -1;

      if (!existing || inviteTime > existingTime) {
        pendingByAccount.set(accountKey, {
          id: invite.id,
          email: invite.invitedEmail,
          firstName: null,
          lastName: null,
          invitedAt: invite.createdAt,
          acceptedAt: null,
        });
      }
    });

  res.json({
    pending: Array.from(pendingByAccount.values()).sort(
      (a, b) => b.invitedAt.getTime() - a.invitedAt.getTime(),
    ),
    accepted: acceptedValues.sort((a, b) => {
      const aTime = (a.acceptedAt || a.invitedAt).getTime();
      const bTime = (b.acceptedAt || b.invitedAt).getTime();
      return bTime - aTime;
    }),
  });
});

workspacesRouter.delete("/:id/invitations/:invitationId", async (req, res) => {
  const workspaceId = sanitizeLine(req.params.id);
  const invitationId = sanitizeLine(req.params.invitationId);
  if (!workspaceId || !invitationId) {
    return res
      .status(400)
      .json({ error: "workspace id ve davet id gerekli" });
  }

  const profile = await upsertUserProfile(req.authUser!);
  const membership = await getWorkspaceMember(profile.id, workspaceId);
  if (!membership) {
    return res.status(403).json({ error: "Bu calisma alanina erisiminiz yok." });
  }

  if (membership.role !== "OWNER") {
    return res
      .status(403)
      .json({ error: "Daveti sadece calisma alani sahibi iptal edebilir." });
  }

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, workspaceId },
    select: { id: true, invitedEmail: true, status: true },
  });

  if (!invitation) {
    return res.status(404).json({ error: "Davet bulunamadi." });
  }

  if (invitation.status !== "PENDING") {
    return res
      .status(400)
      .json({ error: "Yalnizca bekleyen davetler iptal edilebilir." });
  }

  // Bekleyen davet listesi kanonik e-postaya gore tekillestirildiginden, ayni
  // kisiye ait tum bekleyen davetleri kaldirmak gerekiyor.
  const emailKey = canonicalizeEmailForInvite(invitation.invitedEmail);
  const pendingInvites = await prisma.invitation.findMany({
    where: { workspaceId, status: "PENDING" },
    select: { id: true, invitedEmail: true },
  });
  const idsToDelete = pendingInvites
    .filter(
      (invite) => canonicalizeEmailForInvite(invite.invitedEmail) === emailKey,
    )
    .map((invite) => invite.id);

  await prisma.invitation.deleteMany({ where: { id: { in: idsToDelete } } });

  res.status(204).end();
});

workspacesRouter.post("/", async (req, res) => {
  const { payload, errors } = validateWorkspacePayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const profile = await upsertUserProfile(req.authUser!);

  const workspace = await prisma.workspace.create({
    data: {
      name: payload.name,
      type: payload.type,
      color: payload.color,
      icon: payload.icon,
      createdByUserId: profile.id,
      members: {
        create: {
          userProfileId: profile.id,
          role: "OWNER",
        },
      },
    },
  });

  res.status(201).json({
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    color: workspace.color,
    icon: workspace.icon,
    role: "OWNER" as WorkspaceRole,
  });
});

workspacesRouter.put("/:id", async (req, res) => {
  const workspaceId = sanitizeLine(req.params.id);
  if (!workspaceId) {
    return res.status(400).json({ error: "workspace id is required" });
  }

  const { payload, errors } = validateWorkspacePayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const profile = await upsertUserProfile(req.authUser!);
  const membership = await getWorkspaceMember(profile.id, workspaceId);
  if (!membership) {
    return res.status(403).json({ error: "Bu calisma alanina erisiminiz yok." });
  }

  if (membership.role !== "OWNER") {
    return res
      .status(403)
      .json({ error: "Calisma alani sadece sahip tarafindan guncellenebilir." });
  }

  const workspace = await prisma.workspace.update({
    where: {
      id: workspaceId,
    },
    data: {
      name: payload.name,
    },
  });

  res.json({
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    color: workspace.color,
    icon: workspace.icon,
    role: membership.role,
  });
});

workspacesRouter.delete("/:id", async (req, res) => {
  const workspaceId = sanitizeLine(req.params.id);
  if (!workspaceId) {
    return res.status(400).json({ error: "workspace id is required" });
  }

  const profile = await upsertUserProfile(req.authUser!);
  const membership = await getWorkspaceMember(profile.id, workspaceId);
  if (!membership) {
    return res.status(403).json({ error: "Bu calisma alanina erisiminiz yok." });
  }

  if (membership.role !== "OWNER") {
    return res
      .status(403)
      .json({ error: "Calisma alani sadece sahip tarafindan silinebilir." });
  }

  await prisma.workspace.delete({
    where: {
      id: workspaceId,
    },
  });

  await ensureDefaultWorkspaceForUser(profile.id);
  res.status(204).end();
});

tasksRouter.get("/", async (req, res) => {
  const profile = await upsertUserProfile(req.authUser!);
  await ensureDefaultWorkspaceForUser(profile.id);

  const workspaceId = sanitizeLine(String(req.query.workspaceId ?? ""));
  if (workspaceId) {
    const membership = await getWorkspaceMember(profile.id, workspaceId);
    if (!membership) {
      return res.status(403).json({ error: "Bu calisma alanina erisiminiz yok." });
    }
  }

  // Görünürlük: çalışma alanının üyesi olmak + (o alanın sahibi olmak VEYA alan
  // Bilgi Alanı tipinde olmak VEYA göreve atanmış olmak).
  const visibilityWhere = {
    workspace: { members: { some: { userProfileId: profile.id } } },
    OR: [
      {
        workspace: {
          members: { some: { userProfileId: profile.id, role: "OWNER" } },
        },
      },
      { workspace: { type: { not: "TASKS" } } },
      { assigneeId: profile.id },
    ],
  };

  const tasks = await prisma.task.findMany({
    where: workspaceId ? { workspaceId, ...visibilityWhere } : visibilityWhere,
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
    include: taskInclude,
  });

  res.json(tasks);
});

tasksRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const profile = await upsertUserProfile(req.authUser!);

  const { task } = await findVisibleTask(id, profile.id);

  if (!task) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json(task);
});

tasksRouter.get("/:id/comments", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const profile = await upsertUserProfile(req.authUser!);

  const { task } = await findVisibleTask(id, profile.id);

  if (!task) {
    return res.status(404).json({ error: "Not found" });
  }

  const comments = await prisma.taskComment.findMany({
    where: {
      taskId: id,
    },
    include: {
      userProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          picture: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.json(
    comments.map((comment) => ({
      id: comment.id,
      taskId: comment.taskId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.userProfile.id,
        firstName: comment.userProfile.firstName,
        lastName: comment.userProfile.lastName,
        email: comment.userProfile.email,
        picture: comment.userProfile.picture,
      },
    })),
  );
});

tasksRouter.post("/:id/comments", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const { payload, errors } = validateTaskCommentPayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const profile = await upsertUserProfile(req.authUser!);

  const { task } = await findVisibleTask(id, profile.id);

  if (!task) {
    return res.status(404).json({ error: "Not found" });
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId: id,
      userProfileId: profile.id,
      content: payload.content,
    },
    include: {
      userProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          picture: true,
        },
      },
    },
  });

  // Yorum bildirimi: çalışma alanı sahipleri + göreve atanan kişi (yorumu yazan hariç).
  const owners = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: task.workspaceId,
      role: "OWNER",
      userProfileId: { not: profile.id },
    },
    select: { userProfileId: true },
  });

  const recipientIds = [...new Set(owners.map((owner) => owner.userProfileId))];
  if (task.assigneeId && task.assigneeId !== profile.id) {
    if (!recipientIds.includes(task.assigneeId)) {
      recipientIds.push(task.assigneeId);
    }
  }

  const commenterDisplayName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || profile.email || profile.authEmail;

  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map((userProfileId) => ({
        userProfileId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        commentId: comment.id,
        message: `${commenterDisplayName} \"${task.title}\" gorevine yorum yapti.`,
      })),
    });
    await sendPushNotifications(
      recipientIds,
      "Yeni yorum",
      `${commenterDisplayName} "${task.title}" görevine yorum yaptı.`,
      { type: "comment", taskId: task.id },
    );
  }

  res.status(201).json({
    id: comment.id,
    taskId: comment.taskId,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      id: comment.userProfile.id,
      firstName: comment.userProfile.firstName,
      lastName: comment.userProfile.lastName,
      email: comment.userProfile.email,
      picture: comment.userProfile.picture,
    },
  });
});

tasksRouter.delete("/:taskId/comments/:commentId", async (req, res) => {
  const taskId = Number(req.params.taskId);
  const commentId = Number(req.params.commentId);
  if (Number.isNaN(taskId) || Number.isNaN(commentId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const profile = await upsertUserProfile(req.authUser!);

  const comment = await prisma.taskComment.findFirst({
    where: { id: commentId, taskId },
    select: { id: true, userProfileId: true, task: { select: { workspaceId: true } } },
  });

  if (!comment) {
    return res.status(404).json({ error: "Not found" });
  }

  const isAuthor = comment.userProfileId === profile.id;
  if (!isAuthor) {
    const ownerMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: comment.task.workspaceId, userProfileId: profile.id, role: "OWNER" },
      select: { id: true },
    });
    if (!ownerMember) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  await prisma.taskComment.delete({ where: { id: commentId } });
  res.status(204).end();
});

tasksRouter.post("/", async (req, res) => {
  const payload = validateTaskPayload(req.body || {});
  if (payload.errors.length > 0) {
    return res.status(400).json({ error: payload.errors.join(", ") });
  }

  const profile = await upsertUserProfile(req.authUser!);
  const member = await getWorkspaceMember(profile.id, payload.workspaceId);
  if (!member) {
    return res
      .status(403)
      .json({ error: "Bu calisma alanina gorev ekleme yetkiniz yok." });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: payload.workspaceId },
    select: { type: true },
  });

  // Görev tipindeki çalışma alanlarında görev oluşturmayı yalnızca sahip yapar.
  if (workspace?.type === "TASKS" && member.role !== "OWNER") {
    return res
      .status(403)
      .json({ error: "Görev oluşturma yetkiniz yok." });
  }

  if (payload.assigneeId !== null) {
    const assigneeMember = await getWorkspaceMember(
      payload.assigneeId,
      payload.workspaceId,
    );
    if (!assigneeMember) {
      return res
        .status(400)
        .json({ error: "Atanan kişi bu çalışma alanının üyesi değil." });
    }
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
      remindAt: payload.remindAt,
      ownerEmail: profile.authEmail,
      workspaceId: payload.workspaceId,
      assigneeId: payload.assigneeId,
    },
    include: taskInclude,
  });

  if (payload.assigneeId !== null) {
    await notifyAssignment(task, payload.assigneeId, profile);
  }

  res.status(201).json(task);
});

tasksRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const profile = await upsertUserProfile(req.authUser!);

  const { task: existingTask, membership, workspaceType } = await findVisibleTask(
    id,
    profile.id,
  );

  if (!existingTask || !membership) {
    return res.status(404).json({ error: "Not found" });
  }

  const { updateData, errors } = validateTaskUpdatePayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No valid fields provided for update" });
  }

  const isOwner = membership.role === "OWNER";
  const isTaskWorkspace = workspaceType === "TASKS";

  // Görev tipindeki alanda atanan üye yalnızca "Bitirdim" işaretini değiştirebilir;
  // görev durumu (status) yalnızca çalışma alanı sahibine aittir.
  if (!isOwner && isTaskWorkspace) {
    const allowedKeys = new Set(["assigneeDone"]);
    const hasDisallowed = Object.keys(updateData).some(
      (key) => !allowedKeys.has(key),
    );
    if (hasDisallowed) {
      return res
        .status(403)
        .json({ error: "Bu görevde yalnızca 'Bitirdim' işaretini değiştirebilirsiniz." });
    }
  }

  // Sahip görev durumunu gerçekten değiştirdiğinde üyenin "Bitirdim" işareti
  // sıfırlanır (yeniden açılan görev temiz başlar).
  if (
    isOwner &&
    Object.prototype.hasOwnProperty.call(updateData, "status") &&
    updateData.status !== existingTask.status &&
    !Object.prototype.hasOwnProperty.call(updateData, "assigneeDone")
  ) {
    updateData.assigneeDone = false;
  }

  if (
    isOwner &&
    Object.prototype.hasOwnProperty.call(updateData, "assigneeId") &&
    updateData.assigneeId !== null
  ) {
    const assigneeMember = await getWorkspaceMember(
      updateData.assigneeId as number,
      existingTask.workspaceId,
    );
    if (!assigneeMember) {
      return res
        .status(400)
        .json({ error: "Atanan kişi bu çalışma alanının üyesi değil." });
    }
  }

  if (Object.prototype.hasOwnProperty.call(updateData, "remindAt")) {
    const nextRemindAt = updateData.remindAt as Date | null;
    const currentTime = existingTask.remindAt?.getTime() ?? null;
    const nextTime = nextRemindAt?.getTime() ?? null;
    if (currentTime !== nextTime) {
      updateData.reminderNotifiedAt = null;
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    include: taskInclude,
  });

  const assigneeChanged =
    Object.prototype.hasOwnProperty.call(updateData, "assigneeId") &&
    updateData.assigneeId !== existingTask.assigneeId;
  if (isOwner && assigneeChanged && typeof updateData.assigneeId === "number") {
    await notifyAssignment(task, updateData.assigneeId, profile);
  }

  const assigneeDoneTurnedOn =
    Object.prototype.hasOwnProperty.call(updateData, "assigneeDone") &&
    updateData.assigneeDone === true &&
    existingTask.assigneeDone !== true;
  if (!isOwner && isTaskWorkspace && assigneeDoneTurnedOn) {
    await notifyAssigneeDoneToOwners(task, profile);
  }

  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const profile = await upsertUserProfile(req.authUser!);

  const { task: existingTask, membership, workspaceType } = await findVisibleTask(
    id,
    profile.id,
  );

  if (!existingTask || !membership) {
    return res.status(404).json({ error: "Not found" });
  }

  if (workspaceType === "TASKS" && membership.role !== "OWNER") {
    return res
      .status(403)
      .json({ error: "Görevi yalnızca çalışma alanı sahibi silebilir." });
  }

  await prisma.task.delete({ where: { id } });
  res.status(204).end();
});

app.post(["/auth/register", "/api/auth/register"], async (req, res) => {
  const email = normalizeEmail(sanitizeLine(req.body?.email));
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const firstName = sanitizeLine(req.body?.firstName);
  const lastName = sanitizeLine(req.body?.lastName);

  const errors: string[] = [];
  if (!email || !isValidEmail(email)) {
    errors.push("Geçerli bir e-posta adresi girin.");
  }
  if (password.length < 8) {
    errors.push("Şifre en az 8 karakter olmalı.");
  }
  if (!firstName) {
    errors.push("Ad alanı zorunludur.");
  }
  if (errors.length) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  try {
    const existingProfile = await prisma.userProfile.findUnique({ where: { authEmail: email } });

    if (existingProfile?.passwordHash) {
      return res.status(409).json({
        error: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const profile = existingProfile
      ? await prisma.userProfile.update({
          where: { id: existingProfile.id },
          data: { passwordHash },
        })
      : await prisma.userProfile.create({
          data: {
            authEmail: email,
            firstName,
            lastName: lastName || null,
            email,
            passwordHash,
          },
        });

    await ensureDefaultWorkspaceForUser(profile.id);

    const token = signAppToken(profile);
    res.status(201).json({ token });
  } catch (error) {
    console.error("Register failed", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post(["/auth/login", "/api/auth/login"], async (req, res) => {
  const email = normalizeEmail(sanitizeLine(req.body?.email));
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "E-posta ve şifre zorunludur." });
  }

  try {
    const profile = await prisma.userProfile.findUnique({ where: { authEmail: email } });

    if (!profile?.passwordHash) {
      return res.status(401).json({
        error: "Bu e-posta için şifreyle giriş bulunamadı. Google ile giriş yapmayı deneyin.",
      });
    }

    const valid = await bcrypt.compare(password, profile.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "E-posta veya şifre hatalı." });
    }

    const token = signAppToken(profile);
    res.status(200).json({ token });
  } catch (error) {
    console.error("Login failed", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use("/tasks", authenticate, tasksRouter);
app.use("/api/tasks", authenticate, tasksRouter);
app.use("/profile", authenticate, profileRouter);
app.use("/api/profile", authenticate, profileRouter);
app.use("/workspaces", authenticate, workspacesRouter);
app.use("/api/workspaces", authenticate, workspacesRouter);
app.use("/notifications", authenticate, notificationsRouter);
app.use("/api/notifications", authenticate, notificationsRouter);
app.use("/push-tokens", authenticate, pushTokensRouter);
app.use("/api/push-tokens", authenticate, pushTokensRouter);

// Vadesi gelen hatırlatıcı bildirimlerini oluşturur. Kullanıcı isteklerinden
// bağımsız çalışır, bu yüzden `authenticate` yerine CRON_SECRET ile korunur.
// Harici bir zamanlayıcı (cron-job.org, GitHub Actions vb.) dakikada bir
// "Authorization: Bearer <CRON_SECRET>" ile çağırabilir.
app.all(["/cron/reminders", "/api/cron/reminders"], async (req, res) => {
  if (!CRON_SECRET) {
    return res.status(503).json({ error: "CRON_SECRET tanımlı değil." });
  }
  const authHeader = req.header("authorization") || req.header("Authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const created = await createDueReminderNotifications();
    res.json({ ok: true, created });
  } catch (error) {
    console.error("Cron reminder sweep failed", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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

app.post(["/invitations", "/api/invitations"], authenticate, async (req, res) => {
  const { payload, errors } = validateInvitationPayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const requesterEmail = normalizeEmail(req.authUser!.email);
  const inviteeEmail = normalizeEmail(payload.inviteeEmail);

  if (requesterEmail === inviteeEmail) {
    return res
      .status(400)
      .json({ error: "Kendinize davet gonderemezsiniz." });
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !Number.isFinite(SMTP_PORT)) {
    return res.status(503).json({
      error:
        "Mail servisi hazir degil. SMTP ayarlarini backend ortam degiskenlerinde tanimlayin.",
    });
  }

  try {
    const inviterProfile = await upsertUserProfile(req.authUser!);
    await ensureDefaultWorkspaceForUser(inviterProfile.id);

    const membership = await getWorkspaceMember(inviterProfile.id, payload.workspaceId);
    if (!membership) {
      return res.status(403).json({ error: "Bu calisma alanina davet yetkiniz yok." });
    }

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: payload.workspaceId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: "Calisma alani bulunamadi." });
    }

    const existingInviteeProfile = await prisma.userProfile.findUnique({
      where: {
        authEmail: inviteeEmail,
      },
      select: {
        id: true,
      },
    });

    // Zaten üye olan biri tekrar davet edilemez.
    if (existingInviteeProfile) {
      const alreadyMember = await getWorkspaceMember(
        existingInviteeProfile.id,
        payload.workspaceId,
      );
      if (alreadyMember) {
        return res
          .status(409)
          .json({ error: "Bu kişi zaten çalışma alanının üyesi." });
      }
    }

    const token = crypto.randomBytes(24).toString("hex");
    const appUrl = resolveAppBaseUrl(req.header("origin") || undefined);
    const inviteLink = buildInviteLink(appUrl, token);

    // Davet edilen kişi -hesabı olsun olmasın- yalnızca daveti kabul ettiğinde
    // üye listesine eklenir. Davet burada sadece PENDING olarak oluşturulur.
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    await prisma.invitation.create({
      data: {
        token,
        workspaceId: workspace.id,
        invitedEmail: inviteeEmail,
        message: payload.message || null,
        invitedByUserId: inviterProfile.id,
        expiresAt,
      },
    });

    const inviterName = [inviterProfile.firstName, inviterProfile.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const displayName = inviterName || inviterProfile.email || inviterProfile.authEmail;
    const inviteText = payload.message
      ? payload.message
      : `${workspace.name} calisma alanina katilip gorevleri birlikte yonetebilirsin.`;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const text = [
      `${displayName} sizi TaskFlow'da \"${workspace.name}\" calisma alanina davet etti.`,
      "",
      "Not:",
      inviteText,
      "",
      `Daveti ac: ${inviteLink}`,
      "",
      "Bu linki actiginda:",
      "- Android uygulamasini indirip kurabilir,",
      "- ya da tarayicidan giris yapip daveti kabul edebilirsin.",
      "Daveti kabul ettiginde calisma alanina eklenirsin.",
      "",
      `Davet eden e-posta: ${inviterProfile.email}`,
      `Davet bitis tarihi: ${expiresAt.toISOString()}`,
    ].join("\n");

    await transporter.sendMail({
      from: SMTP_FROM,
      to: inviteeEmail,
      replyTo: inviterProfile.email,
      subject: `TaskFlow daveti - ${workspace.name}`,
      text,
    });

    res.status(202).json({
      success: true,
      immediateAccessGranted: false,
    });
  } catch (error) {
    console.error("Invitation email failed", error);
    res.status(500).json({ error: "Davet gonderilemedi. Lutfen tekrar deneyin." });
  }
});

app.post(["/invitations/accept", "/api/invitations/accept"], authenticate, async (req, res) => {
  const { payload, errors } = validateInvitationAcceptPayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  try {
    const profile = await upsertUserProfile(req.authUser!);
    await ensureDefaultWorkspaceForUser(profile.id);

    const invitation = await prisma.invitation.findUnique({
      where: {
        token: payload.token,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Davet bulunamadi." });
    }

    const invitedEmailCanonical = canonicalizeEmailForInvite(invitation.invitedEmail);
    const profileEmailCanonical = canonicalizeEmailForInvite(profile.authEmail);
    const isInvitedEmailMatch = invitedEmailCanonical === profileEmailCanonical;

    if (invitation.status === "ACCEPTED") {
      const acceptedByCurrentUser = invitation.acceptedByUserId === profile.id;
      if (!acceptedByCurrentUser && !isInvitedEmailMatch) {
        return res.status(403).json({
          error: "Bu davet farkli bir e-posta adresine gonderilmis.",
        });
      }

      return res.status(200).json({
        success: true,
        workspace: invitation.workspace,
        alreadyAccepted: true,
      });
    }

    if (invitation.status !== "PENDING") {
      return res.status(400).json({ error: "Davet gecersiz veya iptal edilmis." });
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      await prisma.invitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: "EXPIRED",
        },
      });
      return res.status(400).json({ error: "Davet suresi dolmus." });
    }

    if (!isInvitedEmailMatch) {
      return res.status(403).json({
        error: "Bu davet farkli bir e-posta adresine gonderilmis.",
      });
    }

    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userProfileId: {
          workspaceId: invitation.workspaceId,
          userProfileId: profile.id,
        },
      },
      update: {},
      create: {
        workspaceId: invitation.workspaceId,
        userProfileId: profile.id,
        role: "MEMBER",
      },
    });

    await prisma.invitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByUserId: profile.id,
      },
    });

    res.status(200).json({
      success: true,
      workspace: invitation.workspace,
    });
  } catch (error) {
    console.error("Invitation accept failed", error);
    res.status(500).json({ error: "Davet kabul edilemedi. Lutfen tekrar deneyin." });
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
    const workspaceCount = await prisma.workspace.count();
    res.status(200).json({ status: "ok", db: "connected", taskCount, workspaceCount });
  } catch (error) {
    console.error("DB health check failed", error);
    res.status(500).json({ status: "error", db: "unavailable" });
  }
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error", error);
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
