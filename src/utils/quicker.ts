import os from "os";
import config from "../config/config";


const getSystemHealth = () => {
    return {
        cpuUsage: os.loadavg(),
        totalMemory: `${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`,
        freeMemory: `${(os.freemem() / 1024 / 1024).toFixed(2)} MB`,
    }
}

const getApplicationHealth = () => {
    return {
        environment: config.NODE_ENV,
        uptime: `${process.uptime().toFixed(2)} seconds`,
        memoryUsage: {
            heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
            heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
        }
    }
}

export {
    getSystemHealth,
    getApplicationHealth,
}