'use strict';

const SYNC_PATH = '/api/magic-diary/entries';

module.exports = () => {
  return async (ctx, next) => {
    if (ctx.path !== SYNC_PATH || ctx.method === 'OPTIONS') {
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
