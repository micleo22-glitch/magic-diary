'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/magic-diary/entitlements',
      handler: 'entitlement.listForUser',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/magic-diary/entitlements',
      handler: 'entitlement.sync',
      config: {
        auth: false,
      },
    },
  ],
};
