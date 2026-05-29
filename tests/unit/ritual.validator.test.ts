import { describe, it, expect } from 'vitest';
import { createRitualPostValidator, updateRitualPatchValidator } from '../../src/validators';

describe('Ritual Validators', () => {
    describe('createRitualPostValidator', () => {
        const validRitualData = {
            name: 'Morning Routine',
            description: 'My morning context switch ritual',
            ritualType: 'custom' as const,
            totalDuration: 300,
            steps: [
                {
                    type: 'braindump' as const,
                    duration: 120,
                    prompt: 'Write down your thoughts'
                },
                {
                    type: 'breathe' as const,
                    duration: 180,
                    prompt: 'Take deep breaths'
                }
            ],
            targetTransition: {
                fromContext: 'work',
                toContext: 'personal'
            }
        };

        it('should accept valid ritual data', () => {
            const result = createRitualPostValidator.safeParse(validRitualData);
            expect(result.success).toBe(true);
        });

        describe('name validation', () => {
            it('should reject name shorter than 2 characters', () => {
                const invalidData = { ...validRitualData, name: 'A' };
                const result = createRitualPostValidator.safeParse(invalidData);

                expect(result.success).toBe(false);
                if (!result.success) {
                    const nameError = result.error.issues.find(e => e.path.includes('name'));
                    expect(nameError?.message).toContain('at least 2 characters');
                }
            });

            it('should reject name longer than 50 characters', () => {
                const invalidData = {
                    ...validRitualData,
                    name: 'A'.repeat(51)
                };
                const result = createRitualPostValidator.safeParse(invalidData);

                expect(result.success).toBe(false);
                if (!result.success) {
                    const nameError = result.error.issues.find(e => e.path.includes('name'));
                    expect(nameError?.message).toContain('at most 50 characters');
                }
            });

            it('should accept name with exactly 2 characters', () => {
                const validData = { ...validRitualData, name: 'AB' };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });

            it('should accept name with exactly 50 characters', () => {
                const validData = { ...validRitualData, name: 'A'.repeat(50) };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });

            it('should trim whitespace from name', () => {
                const dataWithWhitespace = { ...validRitualData, name: '  Test Ritual  ' };
                const result = createRitualPostValidator.safeParse(dataWithWhitespace);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.name).toBe('Test Ritual');
                }
            });
        });

        describe('description validation', () => {
            it('should accept optional description', () => {
                const { description: _description, ...dataWithoutDescription } = validRitualData;
                const result = createRitualPostValidator.safeParse(dataWithoutDescription);
                expect(result.success).toBe(true);
            });

            it('should reject description longer than 1000 characters', () => {
                const invalidData = {
                    ...validRitualData,
                    description: 'A'.repeat(1001)
                };
                const result = createRitualPostValidator.safeParse(invalidData);

                expect(result.success).toBe(false);
                if (!result.success) {
                    const descError = result.error.issues.find(e => e.path.includes('description'));
                    expect(descError?.message).toContain('at most 1000 characters');
                }
            });

            it('should accept description with exactly 1000 characters', () => {
                const validData = {
                    ...validRitualData,
                    description: 'A'.repeat(1000)
                };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });
        });

        describe('ritualType validation', () => {
            it('should accept "custom" ritual type', () => {
                const validData = { ...validRitualData, ritualType: 'custom' as const };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });

            it('should accept "template" ritual type', () => {
                const validData = { ...validRitualData, ritualType: 'template' as const };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });

            it('should reject invalid ritual type', () => {
                const invalidData = { ...validRitualData, ritualType: 'invalid' };
                const result = createRitualPostValidator.safeParse(invalidData);
                expect(result.success).toBe(false);
            });

            it('should default to "custom" if not provided', () => {
                const { ritualType: _ritualType, ...dataWithoutType } = validRitualData;
                const result = createRitualPostValidator.safeParse(dataWithoutType);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.ritualType).toBe('custom');
                }
            });
        });

        describe('totalDuration validation', () => {
            it('should reject duration less than 1 second', () => {
                const invalidData = { ...validRitualData, totalDuration: 0 };
                const result = createRitualPostValidator.safeParse(invalidData);

                expect(result.success).toBe(false);
                if (!result.success) {
                    const durationError = result.error.issues.find(e => e.path.includes('totalDuration'));
                    expect(durationError?.message).toContain('at least 1 second');
                }
            });

            it('should reject duration greater than 3600 seconds', () => {
                const invalidData = { ...validRitualData, totalDuration: 3601 };
                const result = createRitualPostValidator.safeParse(invalidData);

                expect(result.success).toBe(false);
                if (!result.success) {
                    const durationError = result.error.issues.find(e => e.path.includes('totalDuration'));
                    expect(durationError?.message).toContain('60 minutes');
                }
            });

            it('should accept duration of exactly 1 second', () => {
                const validData = { ...validRitualData, totalDuration: 1 };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });

            it('should accept duration of exactly 3600 seconds', () => {
                const validData = { ...validRitualData, totalDuration: 3600 };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });

            it('should coerce string duration to number', () => {
                const dataWithStringDuration = { ...validRitualData, totalDuration: '300' as any };
                const result = createRitualPostValidator.safeParse(dataWithStringDuration);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.totalDuration).toBe(300);
                    expect(typeof result.data.totalDuration).toBe('number');
                }
            });
        });

        describe('steps validation', () => {
            it('should reject empty steps array', () => {
                const invalidData = { ...validRitualData, steps: [] };
                const result = createRitualPostValidator.safeParse(invalidData);

                expect(result.success).toBe(false);
                if (!result.success) {
                    const stepsError = result.error.issues.find(e => e.path.includes('steps'));
                    expect(stepsError?.message).toContain('At least one step');
                }
            });

            it('should accept single step', () => {
                const validData = {
                    ...validRitualData,
                    steps: [{
                        type: 'braindump' as const,
                        duration: 120,
                        prompt: 'Write thoughts'
                    }]
                };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });

            it('should reject step with duration less than 10 seconds', () => {
                const invalidData = {
                    ...validRitualData,
                    steps: [{
                        type: 'braindump' as const,
                        duration: 5,
                        prompt: 'Too short'
                    }]
                };
                const result = createRitualPostValidator.safeParse(invalidData);

                expect(result.success).toBe(false);
                if (!result.success) {
                    const durationError = result.error.issues.find(e =>
                        e.path.includes('duration')
                    );
                    expect(durationError?.message).toContain('at least 10 seconds');
                }
            });

            it('should reject step with duration greater than 3600 seconds', () => {
                const invalidData = {
                    ...validRitualData,
                    steps: [{
                        type: 'braindump' as const,
                        duration: 3601,
                        prompt: 'Too long'
                    }]
                };
                const result = createRitualPostValidator.safeParse(invalidData);

                expect(result.success).toBe(false);
                if (!result.success) {
                    const durationError = result.error.issues.find(e =>
                        e.path.includes('duration')
                    );
                    expect(durationError?.message).toContain('60 minutes');
                }
            });

            it('should reject step with invalid type', () => {
                const invalidData = {
                    ...validRitualData,
                    steps: [{
                        type: 'invalid' as any,
                        duration: 120,
                        prompt: 'Test'
                    }]
                };
                const result = createRitualPostValidator.safeParse(invalidData);
                expect(result.success).toBe(false);
            });

            it('should accept step with optional prompt', () => {
                const validData = {
                    ...validRitualData,
                    steps: [{
                        type: 'braindump' as const,
                        duration: 120
                    }]
                };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });

            it('should reject step with prompt longer than 200 characters', () => {
                const invalidData = {
                    ...validRitualData,
                    steps: [{
                        type: 'braindump' as const,
                        duration: 120,
                        prompt: 'A'.repeat(201)
                    }]
                };
                const result = createRitualPostValidator.safeParse(invalidData);

                expect(result.success).toBe(false);
                if (!result.success) {
                    const promptError = result.error.issues.find(e =>
                        e.path.includes('prompt')
                    );
                    expect(promptError?.message).toContain('at most 200 characters');
                }
            });

            it('should reject step with invalid audioFile URL', () => {
                const invalidData = {
                    ...validRitualData,
                    steps: [{
                        type: 'braindump' as const,
                        duration: 120,
                        prompt: 'Test',
                        audioFile: 'not-a-url'
                    }]
                };
                const result = createRitualPostValidator.safeParse(invalidData);

                expect(result.success).toBe(false);
                if (!result.success) {
                    const urlError = result.error.issues.find(e =>
                        e.path.includes('audioFile')
                    );
                    expect(urlError?.message).toContain('Invalid URL');
                }
            });

            it('should accept step with valid audioFile URL', () => {
                const validData = {
                    ...validRitualData,
                    steps: [{
                        type: 'braindump' as const,
                        duration: 120,
                        prompt: 'Test',
                        audioFile: 'https://example.com/audio.mp3'
                    }]
                };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });
        });

        describe('targetTransition validation', () => {
            it('should accept optional targetTransition', () => {
                const { targetTransition: _targetTransition, ...dataWithoutTransition } = validRitualData;
                const result = createRitualPostValidator.safeParse(dataWithoutTransition);
                expect(result.success).toBe(true);
            });

            it('should accept targetTransition with fromContext only', () => {
                const validData = {
                    ...validRitualData,
                    targetTransition: { fromContext: 'work' }
                };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });

            it('should accept targetTransition with toContext only', () => {
                const validData = {
                    ...validRitualData,
                    targetTransition: { toContext: 'personal' }
                };
                const result = createRitualPostValidator.safeParse(validData);
                expect(result.success).toBe(true);
            });

            it('should default to empty object if not provided', () => {
                const { targetTransition: _targetTransition, ...dataWithoutTransition } = validRitualData;
                const result = createRitualPostValidator.safeParse(dataWithoutTransition);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.targetTransition).toEqual({});
                }
            });
        });
    });

    describe('updateRitualPatchValidator', () => {
        it('should accept partial updates', () => {
            const partialUpdate = {
                name: 'Updated Ritual'
            };
            const result = updateRitualPatchValidator.safeParse(partialUpdate);
            expect(result.success).toBe(true);
        });

        it('should accept empty object (no updates)', () => {
            const result = updateRitualPatchValidator.safeParse({});
            expect(result.success).toBe(true);
        });

        it('should validate name with same rules as create', () => {
            const invalidUpdate = { name: 'A' };
            const result = updateRitualPatchValidator.safeParse(invalidUpdate);

            expect(result.success).toBe(false);
            if (!result.success) {
                const nameError = result.error.issues.find(e => e.path.includes('name'));
                expect(nameError?.message).toContain('at least 2 characters');
            }
        });

        it('should validate description with same rules as create', () => {
            const invalidUpdate = { description: 'A'.repeat(1001) };
            const result = updateRitualPatchValidator.safeParse(invalidUpdate);

            expect(result.success).toBe(false);
            if (!result.success) {
                const descError = result.error.issues.find(e => e.path.includes('description'));
                expect(descError?.message).toContain('at most 1000 characters');
            }
        });

        it('should validate steps array if provided', () => {
            const invalidUpdate = { steps: [] };
            const result = updateRitualPatchValidator.safeParse(invalidUpdate);

            expect(result.success).toBe(false);
            if (!result.success) {
                const stepsError = result.error.issues.find(e => e.path.includes('steps'));
                expect(stepsError).toBeDefined();
            }
        });

        it('should accept valid steps update', () => {
            const validUpdate = {
                steps: [{
                    type: 'braindump' as const,
                    duration: 120,
                    prompt: 'Updated prompt'
                }]
            };
            const result = updateRitualPatchValidator.safeParse(validUpdate);
            expect(result.success).toBe(true);
        });
    });
});

