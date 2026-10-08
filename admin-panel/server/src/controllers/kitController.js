const { z } = require('zod');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const storage = require('../services/storage');

const kitSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional().default(''),
  price: z.coerce.number().nonnegative(),
  isActive: z.boolean().optional().default(true),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive().default(1),
        studentPicksSize: z.boolean().default(true),
        autoMatchHouseColor: z.boolean().default(false),
      })
    )
    .default([]),
});

async function getKitStockWarnings(kitId) {
  const items = await db('kit_items as ki')
    .join('products as p', 'p.id', 'ki.product_id')
    .where('ki.kit_id', kitId)
    .select('ki.*', 'p.name as product_name');

  const warnings = [];
  for (const item of items) {
    const variants = await db('product_variants')
      .where({ product_id: item.product_id, is_active: true });
    const zero = variants.filter((v) => v.stock_qty === 0);
    if (zero.length) {
      warnings.push({
        productId: item.product_id,
        productName: item.product_name,
        zeroStockSkus: zero.map((v) => v.sku),
      });
    }
  }
  return warnings;
}

async function getActiveKit(req, res, next) {
  try {
    let kit = await db('kits').where({ is_active: true }).orderBy('id', 'desc').first();
    if (!kit) kit = await db('kits').orderBy('id', 'desc').first();
    if (!kit) {
      return res.json({ success: true, data: { kit: null, items: [], warnings: [] } });
    }
    const items = await db('kit_items as ki')
      .join('products as p', 'p.id', 'ki.product_id')
      .where('ki.kit_id', kit.id)
      .select('ki.*', 'p.name as product_name', 'p.slug as product_slug');
    const warnings = await getKitStockWarnings(kit.id);
    res.json({
      success: true,
      data: {
        kit: {
          id: kit.id,
          name: kit.name,
          description: kit.description,
          imageUrl: kit.image_url,
          price: Number(kit.price),
          isActive: Boolean(kit.is_active),
        },
        items: items.map((i) => ({
          id: i.id,
          productId: i.product_id,
          productName: i.product_name,
          quantity: i.quantity,
          studentPicksSize: Boolean(i.student_picks_size),
          autoMatchHouseColor: Boolean(i.auto_match_house_color),
        })),
        warnings,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function saveKit(req, res, next) {
  try {
    const body = kitSchema.parse(req.body);
    const id = await db.transaction(async (trx) => {
      let kit = await trx('kits').orderBy('id', 'desc').first();
      if (!kit) {
        const [kitId] = await trx('kits').insert({
          name: body.name,
          description: body.description,
          price: body.price,
          is_active: body.isActive,
        });
        kit = { id: kitId };
      } else {
        await trx('kits').where({ id: kit.id }).update({
          name: body.name,
          description: body.description,
          price: body.price,
          is_active: body.isActive,
          updated_at: trx.fn.now(),
        });
      }
      await trx('kit_items').where({ kit_id: kit.id }).del();
      for (const item of body.items) {
        await trx('kit_items').insert({
          kit_id: kit.id,
          product_id: item.productId,
          quantity: item.quantity,
          student_picks_size: item.studentPicksSize,
          auto_match_house_color: item.autoMatchHouseColor,
        });
      }
      return kit.id;
    });
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function uploadKitImage(req, res, next) {
  try {
    const kit = await db('kits').orderBy('id', 'desc').first();
    if (!kit) throw new AppError('Create kit first', 400);
    if (!req.file) throw new AppError('Image required', 400);
    const url = await storage.saveUploadedFile(req.file);
    await db('kits').where({ id: kit.id }).update({ image_url: url, updated_at: db.fn.now() });
    res.json({ success: true, data: { imageUrl: url } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getActiveKit,
  saveKit,
  uploadKitImage,
};
