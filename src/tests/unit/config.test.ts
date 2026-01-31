// Configuration tests
import { appConfig } from '../../shared/config';

describe('Configuration', () => {
  test('should load default configuration', () => {
    expect(appConfig).toBeDefined();
    expect(appConfig.app).toBeDefined();
    expect(appConfig.app.name).toBe('GramAI Advisor');
    expect(appConfig.app.port).toBe(3000);
  });

  test('should have database configuration', () => {
    expect(appConfig.database).toBeDefined();
    expect(appConfig.database.postgres).toBeDefined();
    expect(appConfig.database.redis).toBeDefined();
    expect(appConfig.database.elasticsearch).toBeDefined();
  });

  test('should have security configuration', () => {
    expect(appConfig.security).toBeDefined();
    expect(appConfig.security.jwt).toBeDefined();
    expect(appConfig.security.jwt.secret).toBeDefined();
  });

  test('should validate required fields', () => {
    expect(appConfig.app.name).toBeTruthy();
    expect(appConfig.app.port).toBeGreaterThan(0);
    expect(appConfig.database.postgres.url).toBeTruthy();
    expect(appConfig.security.jwt.secret).toBeTruthy();
  });
});