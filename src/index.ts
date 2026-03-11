import app from "./app";
import config from "./config/config";
import dbConnect from "./config/db";

const PORT = config.PORT || 4000;

dbConnect()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Connected ✅");
      console.log(`Server is running at PORT:${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Mongodb connection error ❌", error);
  });
