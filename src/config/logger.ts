import { createLogger, format, transports } from "winston";
import "winston-mongodb";
import { ConsoleTransportInstance, FileTransportInstance } from "winston/lib/winston/transports";
import util from "util";
import config from "./config";
import path from "path";
import * as sourceMapSupport from "source-map-support";
import { blue, green, magenta, red, yellow } from "colorette";
import { MongoDBTransportInstance } from "winston-mongodb";


// Linking source map support
sourceMapSupport.install();

const colorizeLevel = (level: string) => {
    switch (level) {
        case "ERROR":
            return red(level);
        case "INFO":
            return blue(level);
        case "WARN":
            return yellow(level);
        default:
            return level;
    }
}

const consoleLogFormat = format.printf((info) => {
    const { level, message, timestamp, meta = {} } = info;
    const customLevel = colorizeLevel(level.toUpperCase());
    const customTimestamp = green(timestamp as string);
    const customMessage = message;
    const customMeta = util.inspect(meta, {
        showHidden: false,
        depth: null,
        colors: true,
    });

    const customLog = `${customLevel} [${customTimestamp}] ${customMessage}\n${magenta("META")} ${customMeta}\n`;

    return customLog;
})

const consoleTransport = (): Array<ConsoleTransportInstance> => {
    if (config.NODE_ENV === "development") {
        return [
            new transports.Console({
                level: "info",
                format: format.combine(format.timestamp(), consoleLogFormat)
            })
        ]
    }

    return [];
}

// @ts-ignore
const fileLogFormat = format.printf((info) => {
    const { level, message, timestamp, meta = {} } = info;

    const logMeta: Record<string, unknown> = {};

    // @ts-ignore
    for (const [key, value] of Object.entries(meta)) {
        if (value instanceof Error) {
            logMeta[key] = {
                name: value.name,
                message: value.message,
                stack: value.stack || "",
            }
        } else {
            logMeta[key] = value;
        }

        const logData = {
            level: level.toUpperCase(),
            message,
            timestamp,
            meta: logMeta,
        }

        return JSON.stringify(logData, null, 4);
    }
});

const fileTransport = (): Array<FileTransportInstance> => {
    return [
        new transports.File({
            filename: path.join(__dirname, "../", "../", "logs", `${config.NODE_ENV}.log`),
            level: "info",
            format: format.combine(format.timestamp(), fileLogFormat),
        })
    ]
}

const mongodbTransport = (): Array<MongoDBTransportInstance> => {
    return [
        new transports.MongoDB({
            level: "info",
            db: config.MONGO_URI,
            metaKey: "meta",
            expireAfterSeconds: 3600 * 24 * 30,
            collection: "application.logs",
        })
    ]
}

export default createLogger({
    defaultMeta: {
        meta: {},
    },
    transports: [...fileTransport(), ...mongodbTransport() , ...consoleTransport()]
});