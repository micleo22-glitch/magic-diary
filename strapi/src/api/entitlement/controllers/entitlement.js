'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

function toApiEntitlement(entitlement) {
  return {
    id: entitlement.id,
    documentId: entitlement.documentId,
    user_id: entitlement.user_id,
    agent_id: entitlement.agent_id,
    source: entitlement.source || 'stripe',
    stripe_session_id: entitlement.stripe_session_id || null,
    createdAt: entitlement.createdAt,
    updatedAt: entitlement.updatedAt,
  };
}

module.exports = createCoreController('api::entitlement.entitlement', ({ strapi }) => ({
  async listForUser(ctx) {
    const userId = ctx.query.user_id;
    const agentId = ctx.query.agent_id;

    if (!userId || typeof userId !== 'string') {
      ctx.status = 400;
      ctx.body = { error: 'user_id is required' };
      return;
    }

    const where = { user_id: userId };
    if (agentId && typeof agentId === 'string') {
      where.agent_id = agentId;
    }

    const entitlements = await strapi.db.query('api::entitlement.entitlement').findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });

    ctx.body = { data: entitlements.map(toApiEntitlement) };
  },

  async sync(ctx) {
    const { action = 'upsert', entitlement } = ctx.request.body ?? {};

    if (!entitlement?.user_id || !entitlement?.agent_id) {
      ctx.status = 400;
      ctx.body = { error: 'entitlement.user_id and entitlement.agent_id are required' };
      return;
    }

    const where = {
      user_id: entitlement.user_id,
      agent_id: entitlement.agent_id,
    };

    const existing = await strapi.db.query('api::entitlement.entitlement').findOne({ where });

    if (action === 'delete') {
      if (existing) {
        await strapi.db.query('api::entitlement.entitlement').delete({
          where: { id: existing.id },
        });
      }
      ctx.body = { ok: true };
      return;
    }

    const data = {
      user_id: entitlement.user_id,
      agent_id: entitlement.agent_id,
      source: entitlement.source || 'stripe',
      stripe_session_id: entitlement.stripe_session_id || null,
    };

    const result = existing
      ? await strapi.db.query('api::entitlement.entitlement').update({
          where: { id: existing.id },
          data,
        })
      : await strapi.db.query('api::entitlement.entitlement').create({ data });

    ctx.body = { ok: true, entitlement: toApiEntitlement(result) };
  },
}));
