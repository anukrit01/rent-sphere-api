import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.js';

export const setupSwagger = (app: Express): void => {
  try {
    const specPath = path.resolve(process.cwd(), 'docs/openapi.yaml');
    if (!fs.existsSync(specPath)) {
      logger.warn(`OpenAPI specification file not found at ${specPath}`);
      return;
    }

    const yamlContent = fs.readFileSync(specPath, 'utf8');
    const openApiDoc = YAML.parse(yamlContent);

    const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
      customSiteTitle: 'RentSphere API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
      },
      customCss: `
        .swagger-ui .topbar { background-color: #1a202c; border-bottom: 2px solid #3182ce; }
        .swagger-ui .topbar .topbar-wrapper .link span { color: #f7fafc; font-weight: 700; font-size: 1.25rem; }
      `,
    };

    // Raw specification endpoints
    const serveYaml = (_req: Request, res: Response): void => {
      res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
      res.send(yamlContent);
    };

    const serveJson = (_req: Request, res: Response): void => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json(openApiDoc);
    };

    app.get('/api/docs/openapi.yaml', serveYaml);
    app.get('/api/docs/openapi.json', serveJson);
    app.get('/api/v1/docs/openapi.yaml', serveYaml);
    app.get('/api/v1/docs/openapi.json', serveJson);

    // Swagger UI mounted on /api/docs and /api/v1/docs
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc, swaggerUiOptions));
    app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc, swaggerUiOptions));

    logger.info('Interactive Swagger API Documentation mounted at /api/docs and /api/v1/docs');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Swagger UI documentation');
  }
};
