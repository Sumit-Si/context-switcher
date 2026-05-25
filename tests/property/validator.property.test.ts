import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createRitualPostValidator, updateSwitchLogPatchValidator } from '../../src/validators';

describe('Property-Based Tests for Validators', () => {
    describe('Property 1: Validator Input Acceptance', () => {
        it('should accept any ritual name string between 2-50 characters', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 2, maxLength: 50 }),
                    (name) => {
                        const ritualData = {
                            name,
                            totalDuration: 300,
                            steps: [{
                                type: 'braindump' as const,
                                duration: 60
                            }]
                        };

                        const result = createRitualPostValidator.safeParse(ritualData);

                        // The validator should accept any string 2-50 characters
                        expect(result.success).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Property 2: Validator Input Rejection', () => {
        it('should reject ritual names shorter than 2 characters', () => {
            fc.assert(
                fc.property(
                    fc.string({ maxLength: 1 }),
                    (name) => {
                        const ritualData = {
                            name,
                            totalDuration: 300,
                            steps: [{
                                type: 'braindump' as const,
                                duration: 60
                            }]
                        };

                        const result = createRitualPostValidator.safeParse(ritualData);

                        // The validator should reject strings < 2 characters
                        expect(result.success).toBe(false);
                        if (!result.success) {
                            const nameErrors = result.error.issues.filter(
                                issue => issue.path.includes('name')
                            );
                            expect(nameErrors.length).toBeGreaterThan(0);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject ritual names longer than 50 characters', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 51, maxLength: 100 }),
                    (name) => {
                        const ritualData = {
                            name,
                            totalDuration: 300,
                            steps: [{
                                type: 'braindump' as const,
                                duration: 60
                            }]
                        };

                        const result = createRitualPostValidator.safeParse(ritualData);

                        // The validator should reject strings > 50 characters
                        expect(result.success).toBe(false);
                        if (!result.success) {
                            const nameErrors = result.error.issues.filter(
                                issue => issue.path.includes('name')
                            );
                            expect(nameErrors.length).toBeGreaterThan(0);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Property 7: Focus Quality Range Validation', () => {
        it('should accept only integers 1-5 for focusQuality', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 5 }),
                    (focusQuality) => {
                        const switchLogData = {
                            focusQuality
                        };

                        const result = updateSwitchLogPatchValidator.safeParse(switchLogData);

                        // The validator should accept integers 1-5
                        expect(result.success).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject focusQuality values outside 1-5 range', () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.integer({ max: 0 }),
                        fc.integer({ min: 6 })
                    ),
                    (focusQuality) => {
                        const switchLogData = {
                            focusQuality
                        };

                        const result = updateSwitchLogPatchValidator.safeParse(switchLogData);

                        // The validator should reject values outside 1-5
                        expect(result.success).toBe(false);
                        if (!result.success) {
                            const focusErrors = result.error.issues.filter(
                                issue => issue.path.includes('focusQuality')
                            );
                            expect(focusErrors.length).toBeGreaterThan(0);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
