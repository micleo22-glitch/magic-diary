'use strict';

const crypto = require('node:crypto');
const { createCoreController } = require('@strapi/strapi').factories;

function toApiEntry(entry) {
  return {
    id: entry.app_entry_id || entry.supabase_id,
    documentId: entry.documentId,
    title: entry.title || '',
    content: entry.content || '',
    mood: entry.mood ?? null,
    date: entry.date,
    photos: entry.photos ?? [],
    user_id: entry.user_id,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

module.exports = createCoreController('api::entry.entry', ({ strapi }) => ({
  async listForUser(ctx) {
    const userId = ctx.query.user_id;
    const entryId = ctx.query.entry_id;

    if (!userId || typeof userId !== 'string') {
      ctx.status = 400;
      ctx.body = { error: 'user_id is required' };
      return;
    }

    const where = { user_id: userId };
    if (entryId && typeof entryId === 'string') {
      where.app_entry_id = entryId;
    }

    const entries = await strapi.db.query('api::entry.entry').findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    ctx.body = { data: entries.map(toApiEntry) };
  },

  async sync(ctx) {
    const { action = 'upsert', entry } = ctx.request.body ?? {};

    if (!entry?.app_entry_id && !entry?.supabase_id) {
      ctx.status = 400;
      ctx.body = { error: 'entry.app_entry_id is required' };
      return;
    }

    const appEntryId = entry.app_entry_id || entry.supabase_id || crypto.randomUUID();
    const existing = await strapi.db.query('api::entry.entry').findOne({
      where: { app_entry_id: appEntryId },
    });

    if (action === 'delete') {
      if (existing) {
        await strapi.db.query('api::entry.entry').delete({
          where: { id: existing.id },
        });
      }
      ctx.body = { ok: true };
      return;
    }

    const data = {
      title: entry.title || null,
      content: entry.content || null,
      mood: entry.mood ?? null,
      date: entry.date,
      photos: entry.photos ?? [],
      user_id: entry.user_id,
      app_entry_id: appEntryId,
      supabase_id: appEntryId,
    };

    const result = existing
      ? await strapi.db.query('api::entry.entry').update({
          where: { id: existing.id },
          data,
        })
      : await strapi.db.query('api::entry.entry').create({ data });

    ctx.body = { ok: true, entry: toApiEntry(result) };
  },
}));
