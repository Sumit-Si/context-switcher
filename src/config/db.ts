import mongoose, { connection } from "mongoose";
import config from "../config/config";
import { DB_NAME } from "../constants";
import logger from "./logger";

const dbConnect = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${config.MONGO_URI}/${DB_NAME}?authSource=admin`,
    );

    logger.info("MongoDB connection established", {
      meta: {
        host: connectionInstance.connection.host
      }
    });

    const connection = connectionInstance.connection;
    return { connection };
  } catch (error) {
    logger.error("MongoDB connection error");
    process.exit(1);
  }
};

export default dbConnect;
