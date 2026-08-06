import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import nodemailer from "nodemailer";
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

const DEFAULT_WORKSPACE_COLOR = "#5b8cff";
const DEFAULT_WORKSPACE_ICON = "compass";
const INVITATION_EXPIRY_DAYS = 7;

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
  const errors: string[] = [];

  if (!name) {
    errors.push("name is required");
  }

  return {
    payload: {
      name,
      color,
      icon,
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
  return `${baseUrl}/?inviteToken=${encodeURIComponent(token)}`;
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
const profileRouter = express.Router();
const workspacesRouter = express.Router();

profileRouter.get("/", async (req, res) => {
  const profile = await upsertUserProfile(req.authUser!);
  await ensureDefaultWorkspaceForUser(profile.id);
  res.json(profile);
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

  res.json(profile);
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

  const invitations = await prisma.invitation.findMany({
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
  });

  res.json({
    pending: invitations
      .filter((invite) => invite.status === "PENDING")
      .map((invite) => ({
        id: invite.id,
        email: invite.invitedEmail,
        firstName: null,
        lastName: null,
        invitedAt: invite.createdAt,
        acceptedAt: null,
      })),
    accepted: invitations
      .filter((invite) => invite.status === "ACCEPTED")
      .map((invite) => ({
        id: invite.id,
        userProfileId: invite.acceptedBy?.id || null,
        email: invite.acceptedBy?.email || invite.invitedEmail,
        firstName: invite.acceptedBy?.firstName || null,
        lastName: invite.acceptedBy?.lastName || null,
        invitedAt: invite.createdAt,
        acceptedAt: invite.acceptedAt,
      })),
  });
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

  const tasks = await prisma.task.findMany({
    where: {
      workspace: {
        members: {
          some: {
            userProfileId: profile.id,
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
  });

  res.json(tasks);
});

tasksRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const profile = await upsertUserProfile(req.authUser!);

  const task = await prisma.task.findFirst({
    where: {
      id,
      workspace: {
        members: {
          some: {
            userProfileId: profile.id,
          },
        },
      },
    },
  });

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

  const task = await prisma.task.findFirst({
    where: {
      id,
      workspace: {
        members: {
          some: {
            userProfileId: profile.id,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

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

  const task = await prisma.task.findFirst({
    where: {
      id,
      workspace: {
        members: {
          some: {
            userProfileId: profile.id,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

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
      ownerEmail: profile.authEmail,
      workspaceId: payload.workspaceId,
    },
  });

  res.status(201).json(task);
});

tasksRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const profile = await upsertUserProfile(req.authUser!);

  const existingTask = await prisma.task.findFirst({
    where: {
      id,
      workspace: {
        members: {
          some: {
            userProfileId: profile.id,
          },
        },
      },
    },
  });

  if (!existingTask) {
    return res.status(404).json({ error: "Not found" });
  }

  const { updateData, errors } = validateTaskUpdatePayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No valid fields provided for update" });
  }

  const task = await prisma.task.update({ where: { id }, data: updateData });
  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const profile = await upsertUserProfile(req.authUser!);

  const existingTask = await prisma.task.findFirst({
    where: {
      id,
      workspace: {
        members: {
          some: {
            userProfileId: profile.id,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!existingTask) {
    return res.status(404).json({ error: "Not found" });
  }

  await prisma.task.delete({ where: { id } });
  res.status(204).end();
});

app.use("/tasks", authenticate, tasksRouter);
app.use("/api/tasks", authenticate, tasksRouter);
app.use("/profile", authenticate, profileRouter);
app.use("/api/profile", authenticate, profileRouter);
app.use("/workspaces", authenticate, workspacesRouter);
app.use("/api/workspaces", authenticate, workspacesRouter);

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

    const token = crypto.randomBytes(24).toString("hex");
    const appUrl = resolveAppBaseUrl(req.header("origin") || undefined);
    const inviteLink = buildInviteLink(appUrl, token);
    let expiresAt: Date | null = null;

    if (existingInviteeProfile) {
      const alreadyMember = await getWorkspaceMember(
        existingInviteeProfile.id,
        payload.workspaceId,
      );

      if (!alreadyMember) {
        await prisma.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userProfileId: existingInviteeProfile.id,
            role: "MEMBER",
          },
        });
      }

      await prisma.invitation.create({
        data: {
          token,
          workspaceId: workspace.id,
          invitedEmail: inviteeEmail,
          message: payload.message || null,
          invitedByUserId: inviterProfile.id,
          expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedByUserId: existingInviteeProfile.id,
        },
      });
    } else {
      expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

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
    }

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
      existingInviteeProfile
        ? "Bu hesap sistemde kayitli oldugu icin erisim tanimlandi. Linkten giris yaptiginda gorevleri gorebilirsin."
        : "Linkten giris yaptiktan sonra daveti kabul edip gorevlere ulasabilirsin.",
      "",
      `Davet eden e-posta: ${inviterProfile.email}`,
      expiresAt ? `Davet bitis tarihi: ${expiresAt.toISOString()}` : "",
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
      immediateAccessGranted: Boolean(existingInviteeProfile),
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
