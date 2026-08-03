import { redactPayload } from './audit.service';
import { resourceFromPath } from './audit.interceptor';

describe('redactPayload', () => {
  it('masks sensitive keys and keeps others', () => {
    expect(redactPayload({ login: 'a', password: 'secret', newPassword: 'x' })).toEqual({
      login: 'a',
      password: '[REDACTED]',
      newPassword: '[REDACTED]',
    });
  });

  it('returns null for non objects', () => {
    expect(redactPayload('text')).toBeNull();
  });
});

describe('resourceFromPath', () => {
  it('extracts a resource and id', () => {
    expect(resourceFromPath('/api/admin/users/3f2b2c8e-1b9a-4d3e-9f1a-2c3d4e5f6a7b/credentials?x=1')).toEqual({
      resource: 'admin.users.credentials',
      resourceId: '3f2b2c8e-1b9a-4d3e-9f1a-2c3d4e5f6a7b',
    });
  });
});
