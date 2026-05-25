import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import User from '../../src/models/user.model';
import Context from '../../src/models/context.model';
import jwt from 'jsonwebtoken';
import config from '../../src/config/config';

describe('Context API Integration Tests', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
        // Clear collections
        await User.deleteMany({});
        await Context.deleteMany({});

        // Create a test user
        const user = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test@1234',
            isEmailVerified: true,
        });
        userId = user._id.toString();

        // Generate auth token
        authToken = jwt.sign(
            { _id: userId },
            config.ACCESS_TOKEN_SECRET,
            { expiresIn: config.ACCESS_TOKEN_EXPIRY }
        );
    });

    describe('POST /api/v1/contexts', () => {
        it('should create a new context with valid data', async () => {
            const contextData = {
                name: 'Deep Work',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
                description: 'For focused coding sessions',
            };

            const response = await request(app)
                .post('/api/v1/contexts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(contextData)
                .expect(201);

            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('Deep Work');
            expect(response.body.data.color).toBe('#FF5733');
            expect(response.body.data.cognitiveLoad).toBe('high');
        });

        it('should reject context creation without authentication', async () => {
            const contextData = {
                name: 'Deep Work',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            };

            await request(app)
                .post('/api/v1/contexts')
                .send(contextData)
                .expect(401);
        });

        it('should reject context with invalid name (too short)', async () => {
            const contextData = {
                name: 'ab',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            };

            const response = await request(app)
                .post('/api/v1/contexts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(contextData)
                .expect(422); // Validation errors return 422

            expect(response.body.success).toBe(false);
        });

        it('should reject context with invalid color format', async () => {
            const contextData = {
                name: 'Deep Work',
                color: 'FF5733', // Missing #
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            };

            const response = await request(app)
                .post('/api/v1/contexts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(contextData)
                .expect(422); // Validation errors return 422

            expect(response.body.success).toBe(false);
        });

        it('should reject duplicate context name for same user', async () => {
            const contextData = {
                name: 'Deep Work',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            };

            // Create first context
            await request(app)
                .post('/api/v1/contexts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(contextData)
                .expect(201);

            // Try to create duplicate - expect 400 for duplicate error
            const response = await request(app)
                .post('/api/v1/contexts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(contextData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should accept optional fields', async () => {
            const contextData = {
                name: 'Deep Work',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
                musicSuggestion: 'Lo-fi beats',
                environmentNote: 'Quiet room',
            };

            const response = await request(app)
                .post('/api/v1/contexts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(contextData)
                .expect(201);

            expect(response.body.data.musicSuggestion).toBe('Lo-fi beats');
            expect(response.body.data.environmentNote).toBe('Quiet room');
        });
    });

    describe('GET /api/v1/contexts', () => {
        it('should return all contexts for authenticated user', async () => {
            // Create test contexts
            await Context.create([
                {
                    userId,
                    name: 'Deep Work',
                    color: '#FF5733',
                    icon: 'brain',
                    cognitiveLoad: 'high',
                    emotionalTone: 'calm',
                    energyRequired: 'high',
                },
                {
                    userId,
                    name: 'Meetings',
                    color: '#33FF57',
                    icon: 'people',
                    cognitiveLoad: 'medium',
                    emotionalTone: 'energetic',
                    energyRequired: 'medium',
                },
            ]);

            const response = await request(app)
                .get('/api/v1/contexts')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            // API returns { contexts: [], metadata: {} } structure
            expect(response.body.data.contexts).toHaveLength(2);
        });

        it('should return empty array when user has no contexts', async () => {
            const response = await request(app)
                .get('/api/v1/contexts')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.contexts).toHaveLength(0);
        });

        it('should not return soft-deleted contexts', async () => {
            // Create contexts
            await Context.create([
                {
                    userId,
                    name: 'Active Context',
                    color: '#FF5733',
                    icon: 'brain',
                    cognitiveLoad: 'high',
                    emotionalTone: 'calm',
                    energyRequired: 'high',
                },
                {
                    userId,
                    name: 'Deleted Context',
                    color: '#33FF57',
                    icon: 'people',
                    cognitiveLoad: 'medium',
                    emotionalTone: 'energetic',
                    energyRequired: 'medium',
                    deletedAt: new Date(),
                },
            ]);

            const response = await request(app)
                .get('/api/v1/contexts')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.data.contexts).toHaveLength(1);
            expect(response.body.data.contexts[0].name).toBe('Active Context');
        });

        it('should reject request without authentication', async () => {
            await request(app)
                .get('/api/v1/contexts')
                .expect(401);
        });
    });

    describe('GET /api/v1/contexts/:id', () => {
        it('should return a specific context by id', async () => {
            const context = await Context.create({
                userId,
                name: 'Deep Work',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            });

            const response = await request(app)
                .get(`/api/v1/contexts/${context._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('Deep Work');
            expect(response.body.data._id).toBe(context._id.toString());
        });

        it('should return 404 for non-existent context', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            await request(app)
                .get(`/api/v1/contexts/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should return 500 for invalid context id format', async () => {
            // Invalid ObjectId format causes 500 error
            await request(app)
                .get('/api/v1/contexts/invalid-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(500);
        });

        it('should not allow access to other users contexts', async () => {
            // Create another user
            const otherUser = await User.create({
                username: 'otheruser',
                email: 'other@example.com',
                password: 'Test@1234',
                isEmailVerified: true,
            });

            // Create context for other user
            const otherContext = await Context.create({
                userId: otherUser._id,
                name: 'Other Context',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            });

            // Try to access with first user's token
            await request(app)
                .get(`/api/v1/contexts/${otherContext._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });

    describe('PATCH /api/v1/contexts/:id', () => {
        it('should update context with valid data', async () => {
            const context = await Context.create({
                userId,
                name: 'Deep Work',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            });

            const updateData = {
                name: 'Updated Deep Work',
                color: '#00FF00',
            };

            const response = await request(app)
                .patch(`/api/v1/contexts/${context._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('Updated Deep Work');
            expect(response.body.data.color).toBe('#00FF00');
        });

        it('should allow partial updates', async () => {
            const context = await Context.create({
                userId,
                name: 'Deep Work',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            });

            const updateData = {
                name: 'Updated Name Only',
            };

            const response = await request(app)
                .patch(`/api/v1/contexts/${context._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.data.name).toBe('Updated Name Only');
            expect(response.body.data.color).toBe('#FF5733'); // Unchanged
        });

        it('should reject update with invalid data', async () => {
            const context = await Context.create({
                userId,
                name: 'Deep Work',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            });

            const updateData = {
                name: 'a'.repeat(51), // Too long
            };

            await request(app)
                .patch(`/api/v1/contexts/${context._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(422); // Validation errors return 422
        });

        it('should return 404 for non-existent context', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            await request(app)
                .patch(`/api/v1/contexts/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Updated' })
                .expect(404);
        });

        it('should not allow updating other users contexts', async () => {
            // Create another user
            const otherUser = await User.create({
                username: 'otheruser',
                email: 'other@example.com',
                password: 'Test@1234',
                isEmailVerified: true,
            });

            // Create context for other user
            const otherContext = await Context.create({
                userId: otherUser._id,
                name: 'Other Context',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            });

            // Try to update with first user's token
            await request(app)
                .patch(`/api/v1/contexts/${otherContext._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Hacked' })
                .expect(404);
        });
    });

    describe('DELETE /api/v1/contexts/:id', () => {
        it('should soft delete a context', async () => {
            const context = await Context.create({
                userId,
                name: 'Deep Work',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            });

            const response = await request(app)
                .delete(`/api/v1/contexts/${context._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify soft delete
            const deletedContext = await Context.findById(context._id);
            expect(deletedContext?.deletedAt).not.toBeNull();
        });

        it('should return 404 for non-existent context', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            await request(app)
                .delete(`/api/v1/contexts/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should not allow deleting other users contexts', async () => {
            // Create another user
            const otherUser = await User.create({
                username: 'otheruser',
                email: 'other@example.com',
                password: 'Test@1234',
                isEmailVerified: true,
            });

            // Create context for other user
            const otherContext = await Context.create({
                userId: otherUser._id,
                name: 'Other Context',
                color: '#FF5733',
                icon: 'brain',
                cognitiveLoad: 'high',
                emotionalTone: 'calm',
                energyRequired: 'high',
            });

            // Try to delete with first user's token
            await request(app)
                .delete(`/api/v1/contexts/${otherContext._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should return 500 for invalid context id format', async () => {
            // Invalid ObjectId format causes 500 error
            await request(app)
                .delete('/api/v1/contexts/invalid-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(500);
        });
    });
});
