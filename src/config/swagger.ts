import swaggerJsdoc from 'swagger-jsdoc';
import config from './config';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Context Switcher API',
            version: '1.0.0',
            description: 'Production-ready API for Context Switcher backend - A comprehensive system for managing contexts, rituals, switch logs, and analytics',
            contact: {
                name: 'API Support',
                email: 'support@contextswitcher.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: config.SERVER_URL || 'http://localhost:8000',
                description: 'Development server'
            },
            {
                url: 'https://api.contextswitcher.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token in the format: Bearer <token>'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        statusCode: {
                            type: 'integer',
                            example: 400
                        },
                        message: {
                            type: 'string',
                            example: 'Error message'
                        },
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object'
                            }
                        }
                    }
                },
                Context: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        name: {
                            type: 'string',
                            example: 'Work'
                        },
                        description: {
                            type: 'string',
                            example: 'Work-related tasks and projects'
                        },
                        color: {
                            type: 'string',
                            example: '#3B82F6'
                        },
                        icon: {
                            type: 'string',
                            example: 'briefcase'
                        },
                        userId: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        deletedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Ritual: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        name: {
                            type: 'string',
                            example: 'Morning Focus'
                        },
                        description: {
                            type: 'string',
                            example: 'Morning ritual to start the day focused'
                        },
                        ritualType: {
                            type: 'string',
                            enum: ['start', 'end', 'transition'],
                            example: 'start'
                        },
                        totalDuration: {
                            type: 'integer',
                            example: 300
                        },
                        steps: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    stepType: {
                                        type: 'string',
                                        enum: ['breathe', 'braindump', 'move', 'intention', 'pause']
                                    },
                                    duration: {
                                        type: 'integer'
                                    },
                                    instruction: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        userId: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        deletedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                SwitchLog: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        fromContext: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011',
                            nullable: true
                        },
                        toContext: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439012'
                        },
                        startTime: {
                            type: 'string',
                            format: 'date-time'
                        },
                        endTime: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true
                        },
                        durationInMinutes: {
                            type: 'integer',
                            example: 45,
                            nullable: true
                        },
                        focusQuality: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 5,
                            example: 4,
                            nullable: true
                        },
                        distraction: {
                            type: 'string',
                            example: 'Phone notifications',
                            nullable: true
                        },
                        notes: {
                            type: 'string',
                            example: 'Productive session',
                            nullable: true
                        },
                        projectTag: {
                            type: 'string',
                            example: 'Project Alpha',
                            nullable: true
                        },
                        ritualId: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011',
                            nullable: true
                        },
                        ritualCompleted: {
                            type: 'boolean',
                            example: true
                        },
                        userId: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        deletedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./src/routes/*.ts', './src/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
