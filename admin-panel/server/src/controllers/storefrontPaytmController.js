const { z } = require('zod');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const paytmService = require('../services/paytmService');
const paymentsController = require('./paymentsController');
const storefrontController = require('./storefrontController');

async function initiate(req, res, next) {
  try {
    const schema = z.object({
      orderId: z.coerce.number().int().positive().optional(),
      orderNumber: z.string().optional(),
      admissionNumber: z.string().optional(),
      type: z.enum(['kit', 'individual']).optional(),
      items: z.array(z.any()).optional(),
      notes: z.string().optional(),
    });
    const body = schema.parse(req.body);
    let order;
    if (body.orderId || body.orderNumber) {
      order = body.orderId
        ? await db('orders').where({ id: body.orderId }).first()
        : await db('orders').where({ order_number: body.orderNumber }).first();
    } else {
      req.body.paymentMethod = 'paytm';
      const fakeRes = {
        statusCode: 201,
        payload: null,
        status(c) {
          this.statusCode = c;
          return this;
        },
        json(p) {
          this.payload = p;
        },
      };
      await storefrontController.placeOrder(req, fakeRes, (err) => {
        if (err) throw err;
      });
      if (!fakeRes.payload?.data?.order) {
        throw new AppError(fakeRes.payload?.message || 'Could not create order', fakeRes.statusCode || 400);
      }
      order = await db('orders').where({ id: fakeRes.payload.data.order.id }).first();
    }
    if (!order) throw new AppError('Order not found', 404);
    if (order.payment_status === 'paid') throw new AppError('Order already paid', 400);

    const student = await db('students').where({ id: order.student_id }).first();
    const init = await paytmService.initiateTransaction({
      orderNumber: order.order_number,
      total: order.total,
      admissionNumber: student?.admission_number,
      studentId: student?.id,
    });
    await db('orders').where({ id: order.id }).update({
      paytm_order_id: init.orderId,
      payment_method: 'paytm',
      updated_at: db.fn.now(),
    });
    await db('payment_transactions').insert({
      order_id: order.id,
      paytm_order_id: init.orderId,
      status: 'initiated',
      amount: order.total,
      currency: 'INR',
      gateway_name: 'paytm',
    });
    res.json({
      success: true,
      data: {
        txnToken: init.txnToken,
        mid: init.mid,
        orderId: init.orderId,
        amount: init.amount,
        orderNumber: order.order_number,
        host: init.host,
      },
    });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function callback(req, res, next) {
  try {
    const params = req.body || {};
    const verified = await paytmService.verifyCallback(params);
    const paytmOrderId = params.ORDERID;
    const order = await db('orders').where({ paytm_order_id: paytmOrderId }).first();
    if (!order) throw new AppError('Order not found for Paytm id', 404);
    await db.transaction(async (trx) => {
      const locked = await trx('orders').where({ id: order.id }).forUpdate().first();
      if (paymentsController.resultPaid(verified.statusJson)) {
        await paymentsController.applyPaidResult(trx, locked, verified.statusJson, paytmOrderId);
      } else {
        await paymentsController.applyFailed(
          trx,
          locked,
          paytmOrderId,
          verified.statusJson?.body?.resultInfo?.resultMsg
        );
      }
    });
    res.json({ success: true, message: 'Callback processed' });
  } catch (err) {
    next(err);
  }
}

async function status(req, res, next) {
  try {
    const order = await db('orders').where({ order_number: req.params.orderNumber }).first();
    if (!order) throw new AppError('Order not found', 404);
    res.json({
      success: true,
      data: {
        orderNumber: order.order_number,
        paymentStatus: order.payment_status,
        status: order.status,
        total: Number(order.total),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, callback, status };
