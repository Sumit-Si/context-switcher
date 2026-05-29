import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { beforeAll, afterAll, afterEach, vi } from "vitest";

// Mock email to avoid actual SMTP calls in tests
vi.mock("../src/utils/emailUtils", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose to in-memory database
  await mongoose.connect(mongoUri);

  console.log("✓ Test database connected");
});

afterAll(async () => {
  // Disconnect and stop in-memory MongoDB
  await mongoose.disconnect();
  await mongoServer.stop();

  console.log("✓ Test database disconnected");
});

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
