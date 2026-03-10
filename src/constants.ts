type WhitelistOrigin = string[];

export const WHITELIST_ORIGINS: WhitelistOrigin = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000"
] as const;

export const DB_NAME: string = "context-switcherDB";