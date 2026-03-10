import mongoose from "mongoose";
import config from "../config/config";
import { DB_NAME } from "../constants";


const dbConnect = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${config.MONGO_URI}/${DB_NAME}?authSource=admin`);
        console.log("conn str: ", connectionInstance.connection.host);
    } catch (error) {
        console.error("conn Error", error);
        process.exit(1);
    }
}

export default dbConnect;