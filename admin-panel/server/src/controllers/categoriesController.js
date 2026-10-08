const { z } = require('zod');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const { slugify } = require('../utils/slug');

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().max(150).optional(),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listCategories(req, res, next) {
  try {
    const rows = await db('categories').orderBy('sort_order', 'asc').orderBy('name', 'asc');
    res.json({ success: true, data: { items: rows.map(mapCategory) } });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const body = bodySchema.parse(req.body);
    const slug = body.slug ? slugify(body.slug) : slugify(body.name);
    const exists = await db('categories').where({ slug }).first();
    if (exists) throw new AppError('Slug already exists', 409);
    const [id] = await db('categories').insert({
      name: body.name.trim(),
      slug,
      sort_order: body.sortOrder,
      is_active: body.isActive,
    });
    const row = await db('categories').where({ id }).first();
    res.status(201).json({ success: true, data: { category: mapCategory(row) } });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const body = bodySchema.partial().parse(req.body);
    const row = await db('categories').where({ id: req.params.id }).first();
    if (!row) throw new AppError('Category not found', 404);
    const patch = { updated_at: db.fn.now() };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.slug !== undefined) patch.slug = slugify(body.slug);
    if (body.sortOrder !== undefined) patch.sort_order = body.sortOrder;
    if (body.isActive !== undefined) patch.is_active = body.isActive;
    if (patch.slug) {
      const clash = await db('categories').where({ slug: patch.slug }).whereNot({ id: row.id }).first();
      if (clash) throw new AppError('Slug already exists', 409);
    }
    await db('categories').where({ id: row.id }).update(patch);
    const updated = await db('categories').where({ id: row.id }).first();
    res.json({ success: true, data: { category: mapCategory(updated) } });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const row = await db('categories').where({ id: req.params.id }).first();
    if (!row) throw new AppError('Category not found', 404);
    const used = await db('products').where({ category_id: row.id }).count({ c: '*' }).first();
    if (Number(used.c) > 0) {
      throw new AppError('Category has products. Deactivate instead.', 400);
    }
    await db('categories').where({ id: row.id }).del();
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
