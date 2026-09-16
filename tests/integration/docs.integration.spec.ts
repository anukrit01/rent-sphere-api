import request from 'supertest';
import { app } from '../helpers/app.helper.js';

describe('Swagger / OpenAPI Documentation API (Integration)', () => {
  describe('GET /api/docs/', () => {
    it('should serve Swagger UI HTML page with 200 OK', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('id="swagger-ui"');
      expect(res.text).toContain('RentSphere API Documentation');
    });
  });

  describe('GET /api/docs/openapi.json', () => {
    it('should serve parsed OpenAPI 3.0.3 specification in JSON format', async () => {
      const res = await request(app).get('/api/docs/openapi.json');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info.title).toBe('RentSphere Heavy Machinery Rental API');
      expect(res.body.paths).toBeDefined();

      // Verify key domain endpoints are documented
      expect(res.body.paths['/auth/register']).toBeDefined();
      expect(res.body.paths['/auth/login']).toBeDefined();
      expect(res.body.paths['/assets']).toBeDefined();
      expect(res.body.paths['/bookings']).toBeDefined();
      expect(res.body.paths['/categories']).toBeDefined();
      expect(res.body.paths['/admin/dashboard']).toBeDefined();
      expect(res.body.paths['/admin/audit-logs']).toBeDefined();

      // Verify security schemes
      expect(res.body.components.securitySchemes.BearerAuth).toBeDefined();
      expect(res.body.components.securitySchemes.CookieAuth).toBeDefined();

      // Verify key schemas
      expect(res.body.components.schemas.User).toBeDefined();
      expect(res.body.components.schemas.Asset).toBeDefined();
      expect(res.body.components.schemas.Booking).toBeDefined();
      expect(res.body.components.schemas.ApiErrorResponse).toBeDefined();
    });
  });

  describe('GET /api/docs/openapi.yaml', () => {
    it('should serve raw OpenAPI 3.0.3 specification in YAML format', async () => {
      const res = await request(app).get('/api/docs/openapi.yaml');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('yaml');
      expect(res.text).toContain('openapi: 3.0.3');
      expect(res.text).toContain('RentSphere Heavy Machinery Rental API');
    });
  });

  describe('GET /api/v1/docs/', () => {
    it('should serve Swagger UI on versioned route alias (/api/v1/docs/)', async () => {
      const res = await request(app).get('/api/v1/docs/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('id="swagger-ui"');
    });

    it('should serve OpenAPI JSON on versioned route alias (/api/v1/docs/openapi.json)', async () => {
      const res = await request(app).get('/api/v1/docs/openapi.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
    });
  });
});
