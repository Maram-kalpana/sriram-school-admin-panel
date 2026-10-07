const bcrypt = require('bcryptjs');
const { getPool } = require('../src/db');
const { config } = require('../src/config');

const HOUSES = ['Red', 'Yellow', 'Green', 'Blue'];
const SIZES = ['28', '30', '32', '34', '36'];

const DEFAULT_SETTINGS = {
  kit_to_individual_rule: 'after_kit_order',
  require_second_factor: 'off',
  shipping_flat_fee: '0',
  school_name: 'Sunrise School',
  school_logo: '',
  allow_address_edit: 'false',
  allow_kit_reorder: 'true',
};

function sku(prefix, size, color) {
  const parts = [prefix];
  if (size) parts.push(size);
  if (color) parts.push(color.slice(0, 3).toUpperCase());
  return parts.join('-');
}

async function seed() {
  const pool = getPool();

  const hash = await bcrypt.hash(config.seedAdmin.password, 10);
  await pool.query(
    `INSERT INTO admin_users (email, password_hash, role, is_active)
     VALUES (?, ?, 'super_admin', 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1, role = 'super_admin'`,
    [config.seedAdmin.email, hash]
  );

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await pool.query(
      `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_key = setting_key`,
      [key, value]
    );
  }

  const categories = [
    ['Uniforms', 'uniforms', 1],
    ['Sports', 'sports', 2],
    ['Accessories', 'accessories', 3],
    ['Stationery', 'stationery', 4],
  ];
  const catIds = {};
  for (const [name, slug, sort] of categories) {
    const [existing] = await pool.query('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing.length) catIds[slug] = existing[0].id;
    else {
      const [res] = await pool.query(
        'INSERT INTO categories (name, slug, sort_order, is_active) VALUES (?, ?, ?, 1)',
        [name, slug, sort]
      );
      catIds[slug] = res.insertId;
    }
  }

  const products = [
    {
      name: 'House T-Shirt',
      slug: 'house-t-shirt',
      description: 'Cotton house-color T-shirt with school crest.',
      category: 'uniforms',
      brand: 'SchoolWear',
      base: 450,
      compare: 499,
      tax: 5,
      kit: 1,
      visible: 1,
      sizes: SIZES,
      colors: HOUSES,
      colorName: 'House Color',
      prefix: 'HTS',
      stock: 20,
    },
    {
      name: 'White School Shirt',
      slug: 'white-school-shirt',
      description: 'Half-sleeve formal school shirt.',
      category: 'uniforms',
      brand: 'SchoolWear',
      base: 520,
      kit: 1,
      visible: 1,
      sizes: SIZES,
      colors: null,
      prefix: 'WSS',
      stock: 18,
    },
    {
      name: 'School Trousers',
      slug: 'school-trousers',
      description: 'Navy school trousers.',
      category: 'uniforms',
      brand: 'SchoolWear',
      base: 680,
      kit: 1,
      visible: 1,
      sizes: SIZES,
      colors: null,
      prefix: 'TRS',
      stock: 16,
    },
    {
      name: 'Sports Shorts',
      slug: 'sports-shorts',
      description: 'House-color PE shorts.',
      category: 'sports',
      brand: 'PlayKit',
      base: 320,
      kit: 0,
      visible: 1,
      sizes: SIZES,
      colors: HOUSES,
      colorName: 'House Color',
      prefix: 'SPS',
      stock: 12,
    },
    {
      name: 'House Tie',
      slug: 'house-tie',
      description: 'House-color necktie.',
      category: 'accessories',
      brand: 'SchoolWear',
      base: 150,
      kit: 1,
      visible: 1,
      sizes: null,
      colors: HOUSES,
      colorName: 'House Color',
      prefix: 'TIE',
      stock: 25,
    },
    {
      name: 'School Belt',
      slug: 'school-belt',
      description: 'Adjustable school belt.',
      category: 'accessories',
      brand: 'SchoolWear',
      base: 180,
      kit: 0,
      visible: 1,
      sizes: ['S', 'M', 'L'],
      colors: null,
      prefix: 'BLT',
      stock: 15,
    },
    {
      name: 'Ankle Socks (3-pack)',
      slug: 'ankle-socks',
      description: 'White ankle socks, pack of 3.',
      category: 'accessories',
      brand: 'SchoolWear',
      base: 120,
      kit: 1,
      visible: 1,
      sizes: ['S', 'M', 'L'],
      colors: null,
      prefix: 'SCK',
      stock: 40,
    },
    {
      name: 'School Bag',
      slug: 'school-bag',
      description: 'Durable backpack with school logo.',
      category: 'accessories',
      brand: 'CarryOn',
      base: 890,
      kit: 0,
      visible: 1,
      sizes: null,
      colors: HOUSES,
      colorName: 'House Color',
      prefix: 'BAG',
      stock: 10,
    },
    {
      name: 'Notebook Bundle',
      slug: 'notebook-bundle',
      description: 'Set of 8 ruled notebooks.',
      category: 'stationery',
      brand: 'ClassMate',
      base: 240,
      kit: 1,
      visible: 1,
      sizes: null,
      colors: null,
      prefix: 'NBK',
      stock: 50,
    },
    {
      name: 'Steel Water Bottle',
      slug: 'water-bottle',
      description: '750ml steel bottle.',
      category: 'accessories',
      brand: 'Hydra',
      base: 350,
      kit: 0,
      visible: 1,
      sizes: null,
      colors: ['Silver', 'Blue'],
      colorName: 'Color',
      prefix: 'BTL',
      stock: 14,
    },
  ];

  const productIds = {};
  for (const p of products) {
    const [existing] = await pool.query('SELECT id FROM products WHERE slug = ?', [p.slug]);
    let id;
    if (existing.length) {
      id = existing[0].id;
      await pool.query(
        `UPDATE products SET name=?, description=?, category_id=?, brand=?, base_price=?, compare_at_price=?,
         tax_percent=?, status='active', is_kit_item=?, visible_individually=? WHERE id=?`,
        [p.name, p.description, catIds[p.category], p.brand, p.base, p.compare || null, p.tax || 0, p.kit, p.visible, id]
      );
    } else {
      const [res] = await pool.query(
        `INSERT INTO products (name, slug, description, category_id, brand, images, base_price, compare_at_price,
          tax_percent, status, is_kit_item, visible_individually)
         VALUES (?, ?, ?, ?, ?, JSON_ARRAY(), ?, ?, ?, 'active', ?, ?)`,
        [p.name, p.slug, p.description, catIds[p.category], p.brand, p.base, p.compare || null, p.tax || 0, p.kit, p.visible]
      );
      id = res.insertId;
    }
    productIds[p.slug] = id;

    const sizes = p.sizes || [null];
    const colors = p.colors || [null];
    for (const size of sizes) {
      for (const color of colors) {
        const code = sku(p.prefix, size, color);
        const [v] = await pool.query('SELECT id FROM product_variants WHERE sku = ?', [code]);
        const option1_name = size ? 'Size' : null;
        const option2_name = color ? p.colorName : null;
        if (v.length) {
          await pool.query(
            `UPDATE product_variants SET product_id=?, option1_name=?, option1_value=?, option2_name=?, option2_value=?,
             stock_qty=?, is_active=1 WHERE id=?`,
            [id, option1_name, size, option2_name, color, p.stock, v[0].id]
          );
        } else {
          const [ins] = await pool.query(
            `INSERT INTO product_variants (product_id, sku, option1_name, option1_value, option2_name, option2_value,
              stock_qty, low_stock_threshold, reserved_qty, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, 5, 0, 1)`,
            [id, code, option1_name, size, option2_name, color, p.stock]
          );
          await pool.query(
            `INSERT INTO stock_movements (variant_id, change_qty, reason, note) VALUES (?, ?, 'initial', 'seed')`,
            [ins.insertId, p.stock]
          );
        }
      }
    }
  }

  const [kitRows] = await pool.query('SELECT id FROM kits WHERE name = ?', ['School Kit']);
  let kitId;
  if (kitRows.length) {
    kitId = kitRows[0].id;
    await pool.query(
      `UPDATE kits SET description=?, price=?, is_active=1 WHERE id=?`,
      ['Complete starter kit: house T-shirt, trousers, tie, socks and notebooks.', 1899, kitId]
    );
    await pool.query('DELETE FROM kit_items WHERE kit_id = ?', [kitId]);
  } else {
    const [res] = await pool.query(
      `INSERT INTO kits (name, description, price, is_active)
       VALUES ('School Kit', 'Complete starter kit: house T-shirt, trousers, tie, socks and notebooks.', 1899, 1)`
    );
    kitId = res.insertId;
  }

  const kitItems = [
    ['house-t-shirt', 1, 1, 1],
    ['school-trousers', 1, 1, 0],
    ['house-tie', 1, 0, 1],
    ['ankle-socks', 1, 1, 0],
    ['notebook-bundle', 1, 0, 0],
  ];
  for (const [slug, qty, sizeSel, autoColor] of kitItems) {
    await pool.query(
      `INSERT INTO kit_items (kit_id, product_id, quantity, requires_size_selection, house_color_auto_match)
       VALUES (?, ?, ?, ?, ?)`,
      [kitId, productIds[slug], qty, sizeSel, autoColor]
    );
  }

  const students = [
    ['10101', 'P Sandeep', 'Suresh Kumar', '12 Lake View', 'Banjara Hills', 'Hyderabad', 'TS', '500034', 'Red'],
    ['10102', 'Kalpana', 'Ravi Prasad', '8 Temple Road', 'Ameerpet', 'Hyderabad', 'TS', '500016', 'Red'],
    ['10103', 'Ismail', 'Ahmed Khan', '21 Park Street', 'Tolichowki', 'Hyderabad', 'TS', '500008', 'Yellow'],
    ['10104', 'Mahalaxmi', 'Venkat Rao', '5 Hill Colony', 'Kukatpally', 'Hyderabad', 'TS', '500072', 'Green'],
    ['10105', 'Ashok', 'Narasimha', '9 River Lane', 'Secunderabad', 'TS', '500003', 'Blue'],
  ];
  for (const s of students) {
    await pool.query(
      `INSERT INTO students (admission_number, student_name, parent_name, address1, address2, city, state, zipcode, house_color, phone, kit_status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', 1)
       ON DUPLICATE KEY UPDATE student_name=VALUES(student_name), parent_name=VALUES(parent_name),
         address1=VALUES(address1), address2=VALUES(address2), city=VALUES(city), state=VALUES(state),
         zipcode=VALUES(zipcode), house_color=VALUES(house_color)`,
      s
    );
  }

  await pool.end();
  console.log('seed complete');
  console.log('admin login:', config.seedAdmin.email);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
