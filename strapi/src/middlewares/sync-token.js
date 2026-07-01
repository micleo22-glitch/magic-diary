'use strict';

const SYNC_PATHS = new Set([
  '/api/magic-diary/entries',
  '/api/magic-diary/entitlements',
]);

module.exports = () => {
  return async (ctx, next) => {
    if (!SYNC_PATHS.has(ctx.path) || ctx.method === 'OPTIONS') {
      return next();
    }

    const expected = process.env.STRAPI_SYNC_TOKEN;
    const auth = ctx.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!expected || token !== expected) {
      ctx.status = 401;
      ctx.body = {
        error: {
          status: 401,
          name: 'UnauthorizedError',
          message: 'Invalid sync token.',
        },
      };
      return;
    }

    return next();
  };
};
