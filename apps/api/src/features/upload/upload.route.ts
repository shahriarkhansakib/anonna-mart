import { Hono } from "hono";
import type { AuthVariables } from "../../infra/middleware/auth";
import { requireAuth } from "../../infra/middleware/auth";
import { requireRole } from "../../infra/middleware/role";
import { isCloudinaryConfigured, uploadToCloudinary } from "../../infra/lib/cloudinary";

export const uploadRouter = new Hono<{ Variables: AuthVariables }>();

// GET /api/upload/status (Check if Cloudinary is configured)
uploadRouter.get("/status", requireAuth, async (c) => {
  return c.json({
    success: true,
    configured: isCloudinaryConfigured(),
  });
});

// POST /api/upload (Admin & Staff image upload)
uploadRouter.post("/", requireAuth, requireRole("admin"), async (c) => {
  if (!isCloudinaryConfigured()) {
    return c.json(
      {
        success: false,
        error: "Cloudinary credentials missing",
        message:
          "Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env.local file.",
      },
      503,
    );
  }

  const contentType = c.req.header("content-type") || "";

  // 1. JSON payload with base64 data URL
  if (contentType.includes("application/json")) {
    const body = await c.req.json();
    const file = body.file || body.dataUrl || body.image;
    const folder = body.folder || "anonna-mart";

    if (!file) {
      return c.json({ success: false, error: "Image file or data URL is required" }, 400);
    }

    try {
      const result = await uploadToCloudinary(file, { folder });
      return c.json({ success: true, data: result });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500);
    }
  }

  // 2. Multipart form data
  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "anonna-mart";

    if (!file) {
      return c.json({ success: false, error: "No file provided in form data" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";
    const base64Data = `data:${mimeType};base64,${buffer.toString("base64")}`;

    try {
      const result = await uploadToCloudinary(base64Data, { folder });
      return c.json({ success: true, data: result });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500);
    }
  }

  return c.json({ success: false, error: "Unsupported content type" }, 415);
});
