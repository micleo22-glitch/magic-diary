'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'health.index',
      config: {
        auth: false,
      },
    },
  ],
};
