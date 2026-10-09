/**
 * GST documents, reserved stock, payment_transactions / refunds
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('product_variants', (t) => {
    t.integer('reserved_qty').unsigned().notNullable().defaultTo(0);
  });

  await knex.schema.alterTable('order_items', (t) => {
    t.string('hsn_code', 16).nullable();
    t.decimal('gst_rate', 5, 2).notNullable().defaultTo(0);
    t.decimal('taxable_value', 10, 2).notNullable().defaultTo(0);
    t.decimal('cgst', 10, 2).notNullable().defaultTo(0);
    t.decimal('sgst', 10, 2).notNullable().defaultTo(0);
    t.decimal('igst', 10, 2).notNullable().defaultTo(0);
  });

  await knex.schema.alterTable('orders', (t) => {
    t.decimal('taxable_total', 10, 2).notNullable().defaultTo(0);
    t.decimal('cgst_total', 10, 2).notNullable().defaultTo(0);
    t.decimal('sgst_total', 10, 2).notNullable().defaultTo(0);
    t.decimal('igst_total', 10, 2).notNullable().defaultTo(0);
    t.string('invoice_number', 40).nullable();
    t.timestamp('invoice_date').nullable();
    t.string('packing_slip_number', 40).nullable();
    t.string('stock_state', 20).notNullable().defaultTo('finalized');
    t.string('tracking_number', 80).nullable();
    t.string('courier', 80).nullable();
    t.string('tracking_url', 500).nullable();
    t.string('paytm_order_id', 64).nullable();
  });

  await knex.raw(
    "ALTER TABLE orders MODIFY COLUMN payment_status ENUM('pending','paid','failed','refunded','partially_refunded') NOT NULL DEFAULT 'pending'"
  );

  await knex.schema.raw('CREATE UNIQUE INDEX orders_invoice_number_unique ON orders (invoice_number)');

  await knex.schema.createTable('gst_profile', (t) => {
    t.increments('id').primary();
    t.string('legal_name', 200).notNullable().defaultTo('Scholar Store');
    t.string('gstin', 15).nullable();
    t.string('address', 255).nullable();
    t.string('city', 100).nullable();
    t.string('state', 100).nullable();
    t.string('state_code', 2).nullable();
    t.string('pincode', 10).nullable();
    t.string('email', 190).nullable();
    t.string('phone', 20).nullable();
    t.string('logo', 500).nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('payment_transactions', (t) => {
    t.bigIncrements('id').unsigned().primary();
    t.bigInteger('order_id').unsigned().notNullable();
    t.string('paytm_order_id', 80).notNullable();
    t.string('txn_id', 80).nullable();
    t.string('bank_txn_id', 80).nullable();
    t.enum('status', ['initiated', 'success', 'failed', 'pending', 'refunded']).notNullable().defaultTo('initiated');
    t.decimal('amount', 10, 2).notNullable();
    t.string('currency', 8).notNullable().defaultTo('INR');
    t.string('payment_mode', 40).nullable();
    t.string('gateway_name', 40).notNullable().defaultTo('paytm');
    t.string('resp_code', 20).nullable();
    t.string('resp_msg', 255).nullable();
    t.json('raw_response').nullable();
    t.timestamps(true, true);
    t.foreign('order_id').references('id').inTable('orders').onDelete('CASCADE');
    t.index(['paytm_order_id']);
    t.index(['txn_id']);
    t.index(['order_id']);
  });

  await knex.schema.createTable('payment_refunds', (t) => {
    t.bigIncrements('id').unsigned().primary();
    t.bigInteger('transaction_id').unsigned().notNullable();
    t.string('refund_id', 80).nullable();
    t.decimal('amount', 10, 2).notNullable();
    t.string('status', 40).notNullable().defaultTo('pending');
    t.string('reason', 255).nullable();
    t.bigInteger('admin_user_id').unsigned().nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('transaction_id').references('id').inTable('payment_transactions').onDelete('CASCADE');
    t.foreign('admin_user_id').references('id').inTable('admin_users').onDelete('SET NULL');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('payment_refunds');
  await knex.schema.dropTableIfExists('payment_transactions');
  await knex.schema.dropTableIfExists('gst_profile');
  await knex.raw('DROP INDEX orders_invoice_number_unique ON orders');
  await knex.schema.alterTable('orders', (t) => {
    t.dropColumn('taxable_total');
    t.dropColumn('cgst_total');
    t.dropColumn('sgst_total');
    t.dropColumn('igst_total');
    t.dropColumn('invoice_number');
    t.dropColumn('invoice_date');
    t.dropColumn('packing_slip_number');
    t.dropColumn('stock_state');
    t.dropColumn('tracking_number');
    t.dropColumn('courier');
    t.dropColumn('tracking_url');
    t.dropColumn('paytm_order_id');
  });
  await knex.schema.alterTable('order_items', (t) => {
    t.dropColumn('hsn_code');
    t.dropColumn('gst_rate');
    t.dropColumn('taxable_value');
    t.dropColumn('cgst');
    t.dropColumn('sgst');
    t.dropColumn('igst');
  });
  await knex.schema.alterTable('product_variants', (t) => {
    t.dropColumn('reserved_qty');
  });
};
