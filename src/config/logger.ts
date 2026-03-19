import { createLogger, format, transports } from "winston";
import { ConsoleTransportInstance, FileTransportInstance } from "winston/lib/winston/transports";
import util from "util";
import config from "./config";
import path from "path";
import * as sourceMapSupport from "source-map-support";


// Linking source map support
sourceMapSupport.install();

const consoleLogFormat = format.printf((info) => {
    const { level, message, timestamp, meta = {} } = info;
    const customLevel = level.toUpperCase();
    const customTimestamp = timestamp;
    const customMessage = message;
    const customMeta = util.inspect(meta, {
        showHidden: false,
        depth: null,
    });

    const customLog = `${customLevel} [${customTimestamp}] ${customMessage}\n${"META"} ${customMeta}\n`;

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
})

const fileTransport = (): Array<FileTransportInstance> => {
    return [
        new transports.File({
            filename: path.join(__dirname, "../", "../", "logs", `${config.NODE_ENV}.log`),
            level: "info",
            format: format.combine(format.timestamp(), fileLogFormat),
        })
    ]
}

export default createLogger({
    defaultMeta: {
        meta: {},
    },
    transports: [...fileTransport(), ...consoleTransport()]
});