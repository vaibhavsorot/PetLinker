import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PetLinker API',
      version: '1.0.0',
      description: 'REST API with JWT auth, role-based access, and rescue report CRUD.',
    },
    servers: [{ url: 'http://localhost:5000/api/v1', description: 'Local v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['user', 'staff'] },
          },
        },
        Rescue: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            reporter: { type: 'string' },
            area: { type: 'string' },
            description: { type: 'string' },
            urgency: { type: 'string', enum: ['Low', 'Medium', 'High'] },
            status: { type: 'string', enum: ['Pending', 'Ongoing', 'Resolved'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    paths: {
      '/auth/signup': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user or staff account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password', 'role'],
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                    password: { type: 'string', minLength: 6 },
                    role: { type: 'string', enum: ['user', 'staff'] },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User created' },
            400: { description: 'Validation error' },
            409: { description: 'Email exists' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'role'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                    role: { type: 'string', enum: ['user', 'staff'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'JWT token returned' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user from JWT',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Current user' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/rescues': {
        get: {
          tags: ['Rescues'],
          summary: 'List all rescue reports (staff)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'List of rescues' }, 403: { description: 'Forbidden' } },
        },
        post: {
          tags: ['Rescues'],
          summary: 'Create rescue report',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['location', 'urgency'],
                  properties: {
                    location: { type: 'string' },
                    description: { type: 'string' },
                    urgency: { type: 'string', enum: ['Low', 'Medium', 'High'] },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Created' } },
        },
      },
      '/rescues/mine': {
        get: {
          tags: ['Rescues'],
          summary: 'List my rescue reports',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'User rescues' } },
        },
      },
      '/rescues/{id}': {
        get: {
          tags: ['Rescues'],
          summary: 'Get one rescue report',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Rescue report' }, 404: { description: 'Not found' } },
        },
        put: {
          tags: ['Rescues'],
          summary: 'Update rescue report (owner or staff)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    location: { type: 'string' },
                    description: { type: 'string' },
                    urgency: { type: 'string' },
                    status: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Rescues'],
          summary: 'Delete rescue report (owner pending, or staff)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },
      '/rescues/{id}/status': {
        patch: {
          tags: ['Rescues'],
          summary: 'Update status (staff only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', enum: ['Ongoing', 'Resolved'] } },
                },
              },
            },
          },
          responses: { 200: { description: 'Status updated' } },
        },
      },
      '/dashboard': {
        get: {
          tags: ['Dashboard'],
          summary: 'Staff dashboard stats',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Stats' }, 403: { description: 'Forbidden' } },
        },
      },
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: { 200: { description: 'OK' } },
        },
      },
    },
  },
  apis: [],
}

export const swaggerSpec = swaggerJsdoc(options)
