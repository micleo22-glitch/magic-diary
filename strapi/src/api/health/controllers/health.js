'use strict';

const REQUIRED_ENV = [
  'APP_KEYS',
  'API_TOKEN_SALT',
  'ADMIN_JWT_SECRET',
  'TRANSFER_TOKEN_SALT',
  'JWT_SECRET',
  'STRAPI_SYNC_TOKEN',
  'DATABASE_URL',
  'URL',
];

module.exports = {
  async index(ctx) {
    const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
    let database = 'ok';

    try {
      await strapi.db.connection.raw('select 1');
    } catch (error) {
      database = 'error';
      strapi.log.error(`[health] database check failed: ${error?.message ?? error}`);
    }

    ctx.status = database === 'ok' && missingEnv.length === 0 ? 200 : 503;
    ctx.body = {
      status: ctx.status === 200 ? 'ok' : 'degraded',
      database,
      missingEnv,
    };
  },
};
