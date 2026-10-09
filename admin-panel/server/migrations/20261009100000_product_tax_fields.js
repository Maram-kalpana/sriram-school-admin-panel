/**
 * Product HSN / GST / kit visibility fields
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('products', (t) => {
    t.string('hsn_code', 16).nullable();
    t.decimal('gst_rate', 5, 2).notNullable().defaultTo(0);
    t.boolean('price_includes_gst').notNullable().defaultTo(true);
    t.boolean('include_in_kit').notNullable().defaultTo(true);
  });
  await knex.raw('UPDATE products SET gst_rate = COALESCE(tax_percent, 0)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('products', (t) => {
    t.dropColumn('hsn_code');
    t.dropColumn('gst_rate');
    t.dropColumn('price_includes_gst');
    t.dropColumn('include_in_kit');
  });
};
