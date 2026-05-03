import { v2 as cloudinary } from "cloudinary";
import config from "./config";
import fs from "fs";
import logger from "./logger";


cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath: string, folderName?: string) => {
  if (!localFilePath) {
    throw new Error("uploadOnCloudinary: localFilePath is required");
  }

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folderName ?? "context-switcher",
    });

    logger.info("File uploaded to Cloudinary", {
      meta: {
        url: response.url,
        publicId: response.public_id,
      }
    });

    await fs.promises.unlink(localFilePath);
    return response; // always has .url and .public_id
  } catch (error) {
    logger.error("Cloudinary upload failed", {
      meta: {
        localPath: localFilePath,
        error: error instanceof Error ? error.message : String(error),
      }
    });
    // Clean up temp file even on failure
    if (fs.existsSync(localFilePath)) {
      await fs.promises.unlink(localFilePath);
    }
    throw error; // re-throw — let asyncHandler + globalErrorHandler log it properly
  }
};


const deleteFromCloudinary = async (publicId: string) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    console.log("Deleted from cloudinary. Public id", publicId);
    return response;
  } catch (error) {
    logger.error("Cloudinary delete failed", {
      meta: {
        publicId,
        error: error instanceof Error ? error.message : String(error),
      }
    });
    return null;
  }
};

export {
  uploadOnCloudinary,
  deleteFromCloudinary,
}