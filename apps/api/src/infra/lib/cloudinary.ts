import { v2 as cloudinary } from "cloudinary";
import { logger } from "./logger";

// Initialize Cloudinary with environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (cloudinaryUrl) {
  cloudinary.config({ url: cloudinaryUrl });
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET)
  );
}

export async function uploadToCloudinary(
  fileOrDataUrl: string,
  options: { folder?: string; publicId?: string; resourceType?: "image" | "auto" | "raw" } = {},
): Promise<{
  success: boolean;
  url: string;
  public_id: string;
  format?: string;
  width?: number;
  height?: number;
}> {
  if (!isCloudinaryConfigured()) {
    logger.warn({ module: "cloudinary" }, "Cloudinary credentials not configured in environment.");
    throw new Error(
      "Cloudinary credentials are not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.local",
    );
  }

  try {
    const res = await cloudinary.uploader.upload(fileOrDataUrl, {
      folder: options.folder || "anonna-mart",
      public_id: options.publicId,
      resource_type: options.resourceType || "auto",
      overwrite: true,
    });

    return {
      success: true,
      url: res.secure_url,
      public_id: res.public_id,
      format: res.format,
      width: res.width,
      height: res.height,
    };
  } catch (err: any) {
    logger.error(
      { module: "cloudinary", error: err?.message },
      "Failed to upload image to Cloudinary",
    );
    throw new Error(err?.message || "Failed to upload media to Cloudinary");
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  if (!isCloudinaryConfigured()) return false;
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res.result === "ok";
  } catch (err: any) {
    logger.error(
      { module: "cloudinary", publicId, error: err?.message },
      "Failed to delete from Cloudinary",
    );
    return false;
  }
}

export { cloudinary };
