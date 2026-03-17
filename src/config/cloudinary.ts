import {v2 as cloudinary} from "cloudinary";
import config from "./config";
import fs from "fs";


cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath: string) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: "context-switcher",
        });

        console.log("file uploaded on cloudinary. File src", response.url);

        // once the file is uploaded, we would like to delete it from our server asynchronously
        await fs.promises.unlink(localFilePath);
        return response;
    } catch (error) {
        console.log("Cloudinary Error:", error);

        if (fs.existsSync(localFilePath)) await fs.promises.unlink(localFilePath);
        return null;
    }
}

const deleteFromCloudinary = async (publicId: string) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    console.log("Deleted from cloudinary. Public id", publicId);
    return response;
  } catch (error) {
    console.log("Error deleting from cloudinary", error);
    return null;
  }
};

export {
    uploadOnCloudinary,
    deleteFromCloudinary,
}