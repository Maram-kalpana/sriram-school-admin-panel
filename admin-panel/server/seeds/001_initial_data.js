const bcrypt = require('bcryptjs');

/**
 * Seed: super admin, settings, categories, products/variants, School Kit, 5 students
 * @param {import('knex').Knex} knex
 */
exports.seed = async function seed(knex) {
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  await knex('stock_movements').del();
  await knex('order_status_history').del();
  await knex('order_items').del();
  await knex('orders').del();
  try {
    await knex('payment_refunds').del();
    await knex('payment_transactions').del();
    await knex('gst_profile').del();
  } catch {
    /* tables may not exist on first seed before extra migrations */
  }
  await knex('kit_items').del();
  await knex('kits').del();
  await knex('product_variants').del();
  await knex('product_images').del();
  await knex('products').del();
  await knex('categories').del();
  await knex('import_logs').del();
  await knex('students').del();
  await knex('settings').del();
  await knex('admin_users').del();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  const email = process.env.ADMIN_SEED_EMAIL || 'admin@scholarstore.local';
  const password = process.env.ADMIN_SEED_PASSWORD || 'Admin@12345';
  const name = process.env.ADMIN_SEED_NAME || 'Super Admin';
  const passwordHash = await bcrypt.hash(password, 12);

  const [adminId] = await knex('admin_users').insert({
    name,
    email,
    password_hash: passwordHash,
    role: 'super_admin',
    is_active: true,
  });

  const settings = [
    { setting_key: 'catalog_switch_rule', setting_value: JSON.stringify('after_kit_order') },
    { setting_key: 'extra_login_check', setting_value: JSON.stringify('none') },
    { setting_key: 'allow_kit_reorder', setting_value: JSON.stringify(false) },
    { setting_key: 'allow_student_edit_address', setting_value: JSON.stringify(false) },
    { setting_key: 'low_stock_default_threshold', setting_value: JSON.stringify(5) },
    { setting_key: 'shipping_fee', setting_value: JSON.stringify(0) },
    { setting_key: 'free_shipping_threshold', setting_value: JSON.stringify(null) },
    { setting_key: 'school_name', setting_value: JSON.stringify('Scholar Store') },
    { setting_key: 'school_logo', setting_value: JSON.stringify(null) },
    { setting_key: 'contact_email', setting_value: JSON.stringify('admin@scholarstore.local') },
    { setting_key: 'contact_phone', setting_value: JSON.stringify('') },
    { setting_key: 'order_number_prefix', setting_value: JSON.stringify('SS') },
    { setting_key: 'paytm_enabled', setting_value: JSON.stringify(false) },
    { setting_key: 'paytm_environment', setting_value: JSON.stringify('staging') },
    { setting_key: 'paytm_mid', setting_value: JSON.stringify('') },
    { setting_key: 'paytm_merchant_key', setting_value: JSON.stringify('') },
    { setting_key: 'paytm_website', setting_value: JSON.stringify('WEBSTAGING') },
    { setting_key: 'paytm_industry_type', setting_value: JSON.stringify('Retail') },
    { setting_key: 'paytm_channel_id', setting_value: JSON.stringify('WEB') },
    {
      setting_key: 'payment_methods',
      setting_value: JSON.stringify([
        { id: 'paytm', label: 'Paytm', enabled: false },
        { id: 'cod', label: 'Cash on Delivery / Pay at school', enabled: true },
      ]),
    },
    { setting_key: 'gst_email_timezone', setting_value: JSON.stringify('Asia/Kolkata') },
  ];
  await knex('settings').insert(settings);

  try {
    await knex('gst_profile').insert({
      legal_name: 'Scholar Store',
      gstin: '36AABCU9603R1ZX',
      address: '12-3-45, Near School Gate, Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      state_code: '36',
      pincode: '500034',
      email: 'admin@scholarstore.local',
      phone: '04000000000',
    });
  } catch {
    /* gst_profile exists after GST migration */
  }

  const categoryRows = [
    { name: 'Uniforms', slug: 'uniforms', sort_order: 1, is_active: true },
    { name: 'Sportswear', slug: 'sportswear', sort_order: 2, is_active: true },
    { name: 'Accessories', slug: 'accessories', sort_order: 3, is_active: true },
    { name: 'Footwear', slug: 'footwear', sort_order: 4, is_active: true },
  ];
  await knex('categories').insert(categoryRows);
  const categories = await knex('categories').select('id', 'slug');
  const catId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  const houseColors = ['Red', 'Yellow', 'Green', 'Blue'];
  const sizes = ['S', 'M', 'L', 'XL'];

  const productsDef = [
    {
      name: 'School Shirt',
      slug: 'school-shirt',
      category: 'uniforms',
      brand: 'ScholarWear',
      base_price: 450,
      compare_at_price: 550,
      tax_percent: 5,
      hsn_code: '6105',
      gst_rate: 5,
      description: 'White cotton school shirt with school crest.',
      option1: { name: 'Size', values: sizes },
      option2: { name: 'Color', values: houseColors },
      stock: 25,
    },
    {
      name: 'School Trousers',
      slug: 'school-trousers',
      category: 'uniforms',
      brand: 'ScholarWear',
      base_price: 550,
      tax_percent: 12,
      hsn_code: '6203',
      gst_rate: 12,
      description: 'Navy blue formal school trousers.',
      option1: { name: 'Size', values: sizes },
      stock: 30,
    },
    {
      name: 'House T-Shirt',
      slug: 'house-tshirt',
      category: 'sportswear',
      brand: 'ScholarWear',
      base_price: 350,
      tax_percent: 5,
      hsn_code: '6109',
      gst_rate: 5,
      description: 'House-color sports T-shirt.',
      option1: { name: 'Size', values: sizes },
      option2: { name: 'Color', values: houseColors },
      stock: 20,
    },
    {
      name: 'Sports Shorts',
      slug: 'sports-shorts',
      category: 'sportswear',
      brand: 'ScholarWear',
      base_price: 300,
      tax_percent: 12,
      hsn_code: '6203',
      gst_rate: 12,
      description: 'Comfortable sports shorts.',
      option1: { name: 'Size', values: sizes },
      stock: 40,
    },
    {
      name: 'School Tie',
      slug: 'school-tie',
      category: 'accessories',
      brand: 'ScholarWear',
      base_price: 150,
      tax_percent: 5,
      hsn_code: '6215',
      gst_rate: 5,
      description: 'Official school tie.',
      option1: { name: 'Size', values: ['One Size'] },
      stock: 100,
    },
    {
      name: 'School Belt',
      slug: 'school-belt',
      category: 'accessories',
      brand: 'ScholarWear',
      base_price: 120,
      tax_percent: 12,
      hsn_code: '4203',
      gst_rate: 12,
      description: 'Black leatherette school belt.',
      option1: { name: 'Size', values: ['S', 'M', 'L'] },
      stock: 50,
    },
    {
      name: 'School Socks (Pair)',
      slug: 'school-socks',
      category: 'accessories',
      brand: 'ScholarWear',
      base_price: 80,
      tax_percent: 5,
      hsn_code: '6115',
      gst_rate: 5,
      description: 'White school socks, pack of 1 pair.',
      option1: { name: 'Size', values: ['S', 'M', 'L'] },
      stock: 80,
    },
    {
      name: 'School Cap',
      slug: 'school-cap',
      category: 'accessories',
      brand: 'ScholarWear',
      base_price: 200,
      tax_percent: 5,
      hsn_code: '6505',
      gst_rate: 5,
      description: 'House-color school cap.',
      option1: { name: 'Size', values: ['One Size'] },
      option2: { name: 'Color', values: houseColors },
      stock: 15,
    },
    {
      name: 'School Shoes',
      slug: 'school-shoes',
      category: 'footwear',
      brand: 'ScholarStep',
      base_price: 899,
      compare_at_price: 999,
      tax_percent: 12,
      hsn_code: '6403',
      gst_rate: 12,
      description: 'Black formal school shoes.',
      option1: { name: 'Size', values: ['3', '4', '5', '6', '7', '8'] },
      stock: 12,
    },
    {
      name: 'Sports Shoes',
      slug: 'sports-shoes',
      category: 'footwear',
      brand: 'ScholarStep',
      base_price: 799,
      tax_percent: 12,
      hsn_code: '6404',
      gst_rate: 12,
      description: 'Lightweight sports shoes for PE.',
      option1: { name: 'Size', values: ['3', '4', '5', '6', '7', '8'] },
      stock: 10,
    },
    {
      name: 'School Bag',
      slug: 'school-bag',
      category: 'accessories',
      brand: 'ScholarWear',
      base_price: 799,
      tax_percent: 18,
      hsn_code: '4202',
      gst_rate: 18,
      description: 'Durable school backpack.',
      option1: { name: 'Size', values: ['One Size'] },
      stock: 20,
      option1: { name: 'Size', values: ['3', '4', '5', '6', '7', '8'] },
      stock: 10,
    },
  ];

  const productIdBySlug = {};

  for (const p of productsDef) {
    const [productId] = await knex('products').insert({
      name: p.name,
      slug: p.slug,
      description: p.description,
      category_id: catId[p.category],
      brand: p.brand,
      base_price: p.base_price,
      compare_at_price: p.compare_at_price || null,
      tax_percent: p.tax_percent,
      hsn_code: p.hsn_code || null,
      gst_rate: p.gst_rate != null ? p.gst_rate : p.tax_percent,
      price_includes_gst: true,
      include_in_kit: p.slug !== 'school-bag',
      status: 'active',
      visible_individually: true,
    });
    productIdBySlug[p.slug] = productId;

    const opt1Values = p.option1.values;
    const opt2Values = p.option2 ? p.option2.values : [null];

    for (const v1 of opt1Values) {
      for (const v2 of opt2Values) {
        const parts = [p.slug.toUpperCase().replace(/-/g, ''), v1];
        if (v2) parts.push(String(v2).toUpperCase().slice(0, 3));
        const sku = parts.join('-');

        const [variantId] = await knex('product_variants').insert({
          product_id: productId,
          sku,
          option1_name: p.option1.name,
          option1_value: v1,
          option2_name: p.option2 ? p.option2.name : null,
          option2_value: v2,
          stock_qty: p.stock,
          low_stock_threshold: 5,
          is_active: true,
        });

        await knex('stock_movements').insert({
          variant_id: variantId,
          change_qty: p.stock,
          reason: 'initial',
          admin_user_id: adminId,
          note: 'Seed initial stock',
        });
      }
    }
  }

  const [kitId] = await knex('kits').insert({
    name: 'School Kit',
    description: 'Complete school uniform kit for the academic year.',
    price: 2499,
    is_active: true,
  });

  await knex('kit_items').insert([
    {
      kit_id: kitId,
      product_id: productIdBySlug['school-shirt'],
      quantity: 2,
      student_picks_size: true,
      auto_match_house_color: true,
    },
    {
      kit_id: kitId,
      product_id: productIdBySlug['school-trousers'],
      quantity: 2,
      student_picks_size: true,
      auto_match_house_color: false,
    },
    {
      kit_id: kitId,
      product_id: productIdBySlug['house-tshirt'],
      quantity: 1,
      student_picks_size: true,
      auto_match_house_color: true,
    },
    {
      kit_id: kitId,
      product_id: productIdBySlug['sports-shorts'],
      quantity: 1,
      student_picks_size: true,
      auto_match_house_color: false,
    },
    {
      kit_id: kitId,
      product_id: productIdBySlug['school-tie'],
      quantity: 1,
      student_picks_size: false,
      auto_match_house_color: false,
    },
    {
      kit_id: kitId,
      product_id: productIdBySlug['school-belt'],
      quantity: 1,
      student_picks_size: true,
      auto_match_house_color: false,
    },
    {
      kit_id: kitId,
      product_id: productIdBySlug['school-socks'],
      quantity: 2,
      student_picks_size: true,
      auto_match_house_color: false,
    },
  ]);

  const students = [
    { admission_number: '10101', student_name: 'P Sandeep', parent_name: 'P Ramesh', house_color: 'Red' },
    { admission_number: '10102', student_name: 'Kalpana', parent_name: 'K Srinivas', house_color: 'Red' },
    { admission_number: '10103', student_name: 'Ismail', parent_name: 'I Ahmed', house_color: 'Yellow' },
    { admission_number: '10104', student_name: 'Mahalaxmi', parent_name: 'M Venkat', house_color: 'Green' },
    { admission_number: '10105', student_name: 'Ashok', parent_name: 'A Kumar', house_color: 'Blue' },
  ];

  await knex('students').insert(
    students.map((s) => ({
      ...s,
      address1: '12-3-45, Near School Gate',
      address2: 'Banjara Hills',
      city: 'Hyderabad',
      state: 'TS',
      zipcode: '500034',
      phone: null,
      kit_status: 'pending',
      catalog_override: 'default',
      is_active: true,
    }))
  );

  // eslint-disable-next-line no-console
  console.log(`Seeded admin ${email}, ${productsDef.length} products, School Kit, ${students.length} students`);
};
