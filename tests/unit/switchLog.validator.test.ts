import { describe, it, expect } from "vitest";
import {
  createSwitchLogPostValidator,
  updateSwitchLogPatchValidator,
} from "../../src/validators";
import { Types } from "mongoose";

describe("SwitchLog Validators", () => {
  describe("createSwitchLogPostValidator", () => {
    describe("toContext validation", () => {
      it("should accept valid toContext ObjectId", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject empty toContext", () => {
        const data = {
          toContext: "",
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain(
            "To context is required",
          );
        }
      });

      it("should reject invalid toContext ObjectId", () => {
        const data = {
          toContext: "invalid-id",
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain(
            "Invalid toContext id",
          );
        }
      });

      it("should reject missing toContext", () => {
        const data = {};
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain("toContext");
        }
      });
    });

    describe("fromContext validation", () => {
      it("should accept valid fromContext ObjectId", () => {
        const validToId = new Types.ObjectId().toString();
        const validFromId = new Types.ObjectId().toString();
        const data = {
          toContext: validToId,
          fromContext: validFromId,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing fromContext (optional)", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject invalid fromContext ObjectId", () => {
        const validToId = new Types.ObjectId().toString();
        const data = {
          toContext: validToId,
          fromContext: "invalid-id",
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain(
            "Invalid fromContext id",
          );
        }
      });
    });

    describe("ritualId validation", () => {
      it("should accept valid ritualId ObjectId", () => {
        const validToId = new Types.ObjectId().toString();
        const validRitualId = new Types.ObjectId().toString();
        const data = {
          toContext: validToId,
          ritualId: validRitualId,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing ritualId (optional)", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject invalid ritualId ObjectId", () => {
        const validToId = new Types.ObjectId().toString();
        const data = {
          toContext: validToId,
          ritualId: "invalid-id",
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("Invalid ritualId");
        }
      });
    });

    describe("ritualCompleted validation", () => {
      it("should accept true for ritualCompleted", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          ritualCompleted: true,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept false for ritualCompleted", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          ritualCompleted: false,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should default to false when ritualCompleted is missing", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.ritualCompleted).toBe(false);
        }
      });
    });

    describe("ritualSkipped validation", () => {
      it("should accept true for ritualSkipped", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          ritualSkipped: true,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept false for ritualSkipped", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          ritualSkipped: false,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should default to false when ritualSkipped is missing", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.ritualSkipped).toBe(false);
        }
      });
    });

    describe("distraction validation", () => {
      it("should accept valid distraction string", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          distraction: "Phone notification",
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing distraction (optional)", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject distraction longer than 200 characters", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          distraction: "a".repeat(201),
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("200");
        }
      });

      it("should accept distraction at 200 characters", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          distraction: "a".repeat(200),
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("notes validation", () => {
      it("should accept valid notes string", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          notes: "Productive session",
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing notes (optional)", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject notes longer than 500 characters", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          notes: "a".repeat(501),
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("500");
        }
      });

      it("should accept notes at 500 characters", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          notes: "a".repeat(500),
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("projectTag validation", () => {
      it("should accept valid projectTag string", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          projectTag: "backend-api",
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing projectTag (optional)", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject projectTag longer than 50 characters", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          projectTag: "a".repeat(51),
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("50");
        }
      });

      it("should accept projectTag at 50 characters", () => {
        const validId = new Types.ObjectId().toString();
        const data = {
          toContext: validId,
          projectTag: "a".repeat(50),
        };
        const result = createSwitchLogPostValidator.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("updateSwitchLogPatchValidator", () => {
    describe("distraction validation", () => {
      it("should accept valid distraction string", () => {
        const data = {
          distraction: "Phone notification",
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing distraction (optional)", () => {
        const data = {};
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject distraction longer than 200 characters", () => {
        const data = {
          distraction: "a".repeat(201),
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("200");
        }
      });
    });

    describe("notes validation", () => {
      it("should accept valid notes string", () => {
        const data = {
          notes: "Productive session",
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing notes (optional)", () => {
        const data = {};
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject notes longer than 500 characters", () => {
        const data = {
          notes: "a".repeat(501),
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("500");
        }
      });
    });

    describe("projectTag validation", () => {
      it("should accept valid projectTag string", () => {
        const data = {
          projectTag: "backend-api",
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing projectTag (optional)", () => {
        const data = {};
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject projectTag longer than 50 characters", () => {
        const data = {
          projectTag: "a".repeat(51),
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("50");
        }
      });
    });

    describe("focusQuality validation", () => {
      it("should accept valid focusQuality value (1)", () => {
        const data = {
          focusQuality: 1,
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept valid focusQuality value (5)", () => {
        const data = {
          focusQuality: 5,
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept valid focusQuality value (3)", () => {
        const data = {
          focusQuality: 3,
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing focusQuality (optional)", () => {
        const data = {};
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject focusQuality less than 1", () => {
        const data = {
          focusQuality: 0,
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("at least 1");
        }
      });

      it("should reject focusQuality greater than 5", () => {
        const data = {
          focusQuality: 6,
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("at most 5");
        }
      });
    });

    describe("ritualCompleted validation", () => {
      it("should accept true for ritualCompleted", () => {
        const data = {
          ritualCompleted: true,
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept false for ritualCompleted", () => {
        const data = {
          ritualCompleted: false,
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing ritualCompleted (optional)", () => {
        const data = {};
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("ritualSkipped validation", () => {
      it("should accept true for ritualSkipped", () => {
        const data = {
          ritualSkipped: true,
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept false for ritualSkipped", () => {
        const data = {
          ritualSkipped: false,
        };
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept missing ritualSkipped (optional)", () => {
        const data = {};
        const result = updateSwitchLogPatchValidator.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });
});
