const role = require('../src/middleware/role');
const AppError = require('../src/utils/AppError');

function run(middleware, admin) {
  return new Promise((resolve) => {
    const req = { admin };
    const res = {};
    middleware(req, res, (err) => resolve(err));
  });
}

describe('role middleware', () => {
  test('allows matching role', async () => {
    const err = await run(role('super_admin'), { role: 'super_admin' });
    expect(err).toBeUndefined();
  });

  test('blocks staff from super_admin routes', async () => {
    const err = await run(role('super_admin'), { role: 'staff' });
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(403);
  });
});
