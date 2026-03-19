import app from "./app";
import config from "./config/config";
import dbConnect from "./config/db";
import logger from "./config/logger";

const PORT = config.PORT;

dbConnect()
  .then(() => {
    app.listen(PORT, () => {
      logger.info("DB_CONNECTED ✅");
      // console.log(`Server is running at PORT:${PORT}`);
      logger.info("SERVER_STARTED", {
        meta: {
          PORT: config.PORT,
          SERVER_URL: config.SERVER_URL,
        }
      })
    });
  })
  .catch((error) => {
    // console.log("Mongodb connection error ❌", error);
    logger.error("SERVER_DB_CONNECTION_ERROR", {
      meta: error
    });
  });
