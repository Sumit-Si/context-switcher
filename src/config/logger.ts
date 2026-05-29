import { createLogger, format, transports } from "winston";
import "winston-mongodb";
import type {
  ConsoleTransportInstance,
  FileTransportInstance,
} from "winston/lib/winston/transports";
import util from "util";
import config from "./config";
import path from "path";
import * as sourceMapSupport from "source-map-support";
import { blue, green, magenta, red, yellow } from "colorette";
import type { MongoDBTransportInstance } from "winston-mongodb";

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
};

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
});

const consoleTransport = (): Array<ConsoleTransportInstance> => {
  // Set log level based on environment
  const logLevel = config.NODE_ENV === "development" ? "debug" : "info";

  if (config.NODE_ENV === "development" || config.NODE_ENV === "test") {
    return [
      new transports.Console({
        level: logLevel,
        format: format.combine(format.timestamp(), consoleLogFormat),
      }),
    ];
  }

  // In production, use simpler console format
  return [
    new transports.Console({
      level: logLevel,
      format: format.combine(format.timestamp(), format.json()),
    }),
  ];
};

// @ts-expect-error - Winston format.printf types are incomplete
const fileLogFormat = format.printf((info) => {
  const { level, message, timestamp, meta = {} } = info;

  const logMeta: Record<string, unknown> = {};

  // @ts-expect-error - meta type is not properly inferred
  for (const [key, value] of Object.entries(meta)) {
    if (value instanceof Error) {
      logMeta[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack || "",
      };
    } else {
      logMeta[key] = value;
    }

    const logData = {
      level: level.toUpperCase(),
      message,
      timestamp,
      meta: logMeta,
    };

    return JSON.stringify(logData, null, 4);
  }
});

const fileTransport = (): Array<FileTransportInstance> => {
  // Disable file logging in test environment
  if (config.NODE_ENV === "test") {
    return [];
  }

  return [
    new transports.File({
      filename: path.join(
        __dirname,
        "../",
        "../",
        "logs",
        `${config.NODE_ENV}.log`,
      ),
      level: config.NODE_ENV === "development" ? "debug" : "info",
      format: format.combine(format.timestamp(), fileLogFormat),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ];
};

const mongodbTransport = (): Array<MongoDBTransportInstance> => {
  // Only use MongoDB transport in production for error logs
  if (config.NODE_ENV === "production") {
    return [
      new transports.MongoDB({
        level: "error", // Only log errors to MongoDB in production
        db: config.MONGO_URI,
        metaKey: "meta",
        expireAfterSeconds: 3600 * 24 * 30, // 30 days
        collection: "application.logs",
      }),
    ];
  }
  return [];
};

export default createLogger({
  defaultMeta: {
    meta: {},
  },
  transports: [
    ...fileTransport(),
    ...mongodbTransport(),
    ...consoleTransport(),
  ],
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new transports.File({
      filename: path.join(__dirname, "../", "../", "logs", "exceptions.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  rejectionHandlers: [
    new transports.File({
      filename: path.join(__dirname, "../", "../", "logs", "rejections.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});
