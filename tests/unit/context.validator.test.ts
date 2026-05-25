import { describe, it, expect } from 'vitest';
import { createContextPostValidator, updateContextPatchValidator } from '../../src/validators';

describe('Context Validators', () => {
    describe('createContextPostValidator', () => {
        const validContextData = {
            name: 'Deep Work',
            color: '#FF5733',
            icon: 'brain',
            cognitiveLoad: 'high' as const,
            emotionalTone: 'calm' as const,
            energyRequired: 'high' as const,
        };

        describe('name validation', () => {
            it('should accept valid name', () => {
                const result = createContextPostValidator.safeParse(validContextData);
                expect(result.success).toBe(true);
            });

            it('should reject empty name', () => {
                const data = { ...validContextData, name: '' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('Name is required');
                }
            });

            it('should reject name shorter than 3 characters', () => {
                const data = { ...validContextData, name: 'ab' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('at least 3 characters');
                }
            });

            it('should accept name at 3 characters', () => {
                const data = { ...validContextData, name: 'abc' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject name longer than 50 characters', () => {
                const data = { ...validContextData, name: 'a'.repeat(51) };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('at most 50 characters');
                }
            });

            it('should accept name at 50 characters', () => {
                const data = { ...validContextData, name: 'a'.repeat(50) };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should trim whitespace from name', () => {
                const data = { ...validContextData, name: '  Deep Work  ' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.name).toBe('Deep Work');
                }
            });
        });

        describe('description validation', () => {
            it('should accept valid description', () => {
                const data = { ...validContextData, description: 'For focused coding sessions' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept missing description (optional)', () => {
                const result = createContextPostValidator.safeParse(validContextData);
                expect(result.success).toBe(true);
            });

            it('should reject description longer than 1000 characters', () => {
                const data = { ...validContextData, description: 'a'.repeat(1001) };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('1000 characters');
                }
            });

            it('should accept description at 1000 characters', () => {
                const data = { ...validContextData, description: 'a'.repeat(1000) };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });
        });

        describe('color validation', () => {
            it('should accept valid hex color', () => {
                const data = { ...validContextData, color: '#FF5733' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept lowercase hex color', () => {
                const data = { ...validContextData, color: '#ff5733' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject color without # prefix', () => {
                const data = { ...validContextData, color: 'FF5733' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('Invalid color format');
                }
            });

            it('should reject color with invalid characters', () => {
                const data = { ...validContextData, color: '#GGGGGG' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('Invalid color format');
                }
            });

            it('should reject color with wrong length', () => {
                const data = { ...validContextData, color: '#FF57' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('Invalid color format');
                }
            });
        });

        describe('icon validation', () => {
            it('should accept valid icon', () => {
                const data = { ...validContextData, icon: 'brain' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject icon longer than 100 characters', () => {
                const data = { ...validContextData, icon: 'a'.repeat(101) };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('100 characters');
                }
            });

            it('should accept icon at 100 characters', () => {
                const data = { ...validContextData, icon: 'a'.repeat(100) };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });
        });

        describe('cognitiveLoad validation', () => {
            it('should accept low cognitive load', () => {
                const data = { ...validContextData, cognitiveLoad: 'low' as const };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept medium cognitive load', () => {
                const data = { ...validContextData, cognitiveLoad: 'medium' as const };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept high cognitive load', () => {
                const data = { ...validContextData, cognitiveLoad: 'high' as const };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject invalid cognitive load', () => {
                const data = { ...validContextData, cognitiveLoad: 'INVALID' as any };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
            });
        });

        describe('emotionalTone validation', () => {
            it('should accept calm emotional tone', () => {
                const data = { ...validContextData, emotionalTone: 'calm' as const };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept energetic emotional tone', () => {
                const data = { ...validContextData, emotionalTone: 'energetic' as const };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept analytical emotional tone', () => {
                const data = { ...validContextData, emotionalTone: 'analytical' as const };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept creative emotional tone', () => {
                const data = { ...validContextData, emotionalTone: 'creative' as const };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject invalid emotional tone', () => {
                const data = { ...validContextData, emotionalTone: 'INVALID' as any };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
            });
        });

        describe('energyRequired validation', () => {
            it('should accept low energy required', () => {
                const data = { ...validContextData, energyRequired: 'low' as const };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept medium energy required', () => {
                const data = { ...validContextData, energyRequired: 'medium' as const };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept high energy required', () => {
                const data = { ...validContextData, energyRequired: 'high' as const };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject invalid energy required', () => {
                const data = { ...validContextData, energyRequired: 'INVALID' as any };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
            });
        });

        describe('musicSuggestion validation', () => {
            it('should accept valid music suggestion', () => {
                const data = { ...validContextData, musicSuggestion: 'Lo-fi beats' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept missing music suggestion (optional)', () => {
                const result = createContextPostValidator.safeParse(validContextData);
                expect(result.success).toBe(true);
            });

            it('should reject music suggestion longer than 200 characters', () => {
                const data = { ...validContextData, musicSuggestion: 'a'.repeat(201) };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('200 characters');
                }
            });
        });

        describe('environmentNote validation', () => {
            it('should accept valid environment note', () => {
                const data = { ...validContextData, environmentNote: 'Quiet room with good lighting' };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept missing environment note (optional)', () => {
                const result = createContextPostValidator.safeParse(validContextData);
                expect(result.success).toBe(true);
            });

            it('should reject environment note longer than 200 characters', () => {
                const data = { ...validContextData, environmentNote: 'a'.repeat(201) };
                const result = createContextPostValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('200 characters');
                }
            });
        });
    });

    describe('updateContextPatchValidator', () => {
        describe('color validation', () => {
            it('should accept valid hex color', () => {
                const data = { color: '#FF5733' };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject color longer than 8 characters', () => {
                const data = { color: '#FF5733AA' };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('8 characters');
                }
            });

            it('should reject invalid hex color format', () => {
                const data = { color: 'FF5733' };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('valid hex color');
                }
            });
        });

        describe('emotionalTone validation', () => {
            it('should accept calm emotional tone', () => {
                const data = { emotionalTone: 'calm' as const };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept energetic emotional tone', () => {
                const data = { emotionalTone: 'energetic' as const };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject invalid emotional tone', () => {
                const data = { emotionalTone: 'INVALID' as any };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(false);
            });
        });

        describe('icon validation', () => {
            it('should accept valid icon', () => {
                const data = { icon: 'brain' };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject icon longer than 100 characters', () => {
                const data = { icon: 'a'.repeat(101) };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('100 characters');
                }
            });
        });

        describe('energyRequired validation', () => {
            it('should accept low energy required', () => {
                const data = { energyRequired: 'low' as const };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept high energy required', () => {
                const data = { energyRequired: 'high' as const };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject invalid energy required', () => {
                const data = { energyRequired: 'INVALID' as any };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(false);
            });
        });

        describe('cognitiveLoad validation', () => {
            it('should accept low cognitive load', () => {
                const data = { cognitiveLoad: 'low' as const };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept high cognitive load', () => {
                const data = { cognitiveLoad: 'high' as const };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject invalid cognitive load', () => {
                const data = { cognitiveLoad: 'INVALID' as any };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(false);
            });
        });

        describe('name validation', () => {
            it('should accept valid name', () => {
                const data = { name: 'Deep Work' };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject name longer than 50 characters', () => {
                const data = { name: 'a'.repeat(51) };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('50 characters');
                }
            });
        });

        describe('description validation', () => {
            it('should accept valid description', () => {
                const data = { description: 'For focused coding sessions' };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should reject description longer than 1000 characters', () => {
                const data = { description: 'a'.repeat(1001) };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('1000 characters');
                }
            });
        });

        describe('all fields optional', () => {
            it('should accept empty object (all fields optional)', () => {
                const data = {};
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });

            it('should accept partial update with only one field', () => {
                const data = { name: 'Updated Name' };
                const result = updateContextPatchValidator.safeParse(data);
                expect(result.success).toBe(true);
            });
        });
    });
});
