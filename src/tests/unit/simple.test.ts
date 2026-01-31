// Simple test to verify Jest setup
describe('Simple Test Suite', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle strings', () => {
    expect('GramAI Advisor').toContain('GramAI');
  });

  test('should handle arrays', () => {
    const languages = ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'en'];
    expect(languages).toHaveLength(7);
    expect(languages).toContain('hi');
  });

  test('should handle objects', () => {
    const config = {
      name: 'GramAI Advisor',
      version: '1.0.0',
      port: 3000,
    };
    
    expect(config).toHaveProperty('name');
    expect(config.name).toBe('GramAI Advisor');
    expect(config.port).toBeGreaterThan(0);
  });
});