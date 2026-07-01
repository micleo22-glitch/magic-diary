const crypto = require('node:crypto');

async function notifyNext(strapi, event, result) {
  const appUrl = process.env.NEXT_APP_URL;
  const token = process.env.STRAPI_SYNC_TOKEN;
  if (!appUrl || !token) return;

  try {
    const res = await fetch(`${appUrl.replace(/\/$/, '')}/api/cms/strapi-webhook`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event, [event.startsWith('entitlement.') ? 'entitlement' : 'entry']: result }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      strapi.log.warn(`[cms-webhook] ${event} failed: HTTP ${res.status} ${text.slice(0, 160)}`);
    }
  } catch (error) {
    strapi.log.warn(`[cms-webhook] ${event} failed: ${error?.message ?? error}`);
  }
}

module.exports = {
  register({ strapi }) {
    strapi.db.lifecycles.subscribe({
      models: ['api::entry.entry'],

      beforeCreate(event) {
        const data = event.params.data;
        if (!data.app_entry_id) data.app_entry_id = crypto.randomUUID();
        if (!data.supabase_id) data.supabase_id = data.app_entry_id;
      },

      beforeUpdate(event) {
        const data = event.params.data;
        if (data && !data.app_entry_id && !data.supabase_id) {
          data.app_entry_id = crypto.randomUUID();
          data.supabase_id = data.app_entry_id;
        }
      },

      async afterCreate(event) {
        await notifyNext(strapi, 'entry.create', event.result);
      },

      async afterUpdate(event) {
        await notifyNext(strapi, 'entry.update', event.result);
      },

      async afterDelete(event) {
        await notifyNext(strapi, 'entry.delete', event.result);
      },
    });

    strapi.db.lifecycles.subscribe({
      models: ['api::entitlement.entitlement'],

      async afterCreate(event) {
        await notifyNext(strapi, 'entitlement.create', event.result);
      },

      async afterUpdate(event) {
        await notifyNext(strapi, 'entitlement.update', event.result);
      },

      async afterDelete(event) {
        await notifyNext(strapi, 'entitlement.delete', event.result);
      },
    });
  },
  bootstrap() {},
};
