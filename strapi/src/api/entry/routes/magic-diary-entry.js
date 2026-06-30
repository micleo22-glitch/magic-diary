'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/magic-diary/entries',
      handler: 'entry.listForUser',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/magic-diary/entries',
      handler: 'entry.sync',
      config: {
        auth: false,
      },
    },
  ],
};
