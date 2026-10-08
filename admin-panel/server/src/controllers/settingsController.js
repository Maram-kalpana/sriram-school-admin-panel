const { z } = require('zod');
const nodemailer = require('nodemailer');
const settingsService = require('../services/settingsService');
const storage = require('../services/storage');
const AppError = require('../utils/AppError');

const updateSchema = z.object({
  school_name: z.string().min(1).optional(),
  school_logo: z.string().nullable().optional(),
  contact_email: z.string().email().or(z.literal('')).optional(),
  contact_phone: z.string().optional(),
  order_number_prefix: z.string().min(1).max(10).optional(),
  shipping_fee: z.coerce.number().nonnegative().optional(),
  free_shipping_threshold: z.coerce.number().nonnegative().nullable().optional(),
  catalog_switch_rule: z.enum(['after_kit_order', 'after_first_login']).optional(),
  allow_kit_reorder: z.boolean().optional(),
  extra_login_check: z.enum(['none', 'zipcode', 'parent_phone']).optional(),
  low_stock_default_threshold: z.coerce.number().int().min(0).optional(),
  allow_student_edit_address: z.boolean().optional(),
  paytm_enabled: z.boolean().optional(),
  paytm_environment: z.enum(['staging', 'production']).optional(),
  paytm_mid: z.string().optional(),
  paytm_merchant_key: z.string().optional(),
  paytm_website: z.string().optional(),
  paytm_industry_type: z.string().optional(),
  paytm_channel_id: z.enum(['WEB', 'WAP']).optional(),
  smtp_host: z.string().optional(),
  smtp_port: z.coerce.number().int().optional(),
  smtp_secure: z.boolean().optional(),
  smtp_user: z.string().optional(),
  smtp_password: z.string().optional(),
  smtp_from_name: z.string().optional(),
  smtp_from_email: z.string().optional(),
  payment_methods: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        enabled: z.boolean(),
      })
    )
    .optional(),
});

async function getSettings(req, res, next) {
  try {
    await settingsService.ensureDefaults();
    const settings = await settingsService.getPublicSettings();
    res.json({ success: true, data: { settings } });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const body = updateSchema.parse(req.body);
    const settings = await settingsService.updateSettings(body);
    res.json({ success: true, message: 'Settings saved', data: { settings } });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function uploadLogo(req, res, next) {
  try {
    if (!req.file) throw new AppError('Logo file required', 400);
    const url = await storage.saveUploadedFile(req.file);
    await settingsService.updateSettings({ school_logo: url });
    res.json({ success: true, data: { school_logo: url } });
  } catch (err) {
    next(err);
  }
}

async function sendTestEmail(req, res, next) {
  try {
    const schema = z.object({
      to: z.string().email().optional(),
    });
    const { to } = schema.parse(req.body || {});
    const s = await settingsService.getSettings();
    if (!s.smtp_host || !s.smtp_user) {
      throw new AppError('SMTP is not configured', 400);
    }
    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: Number(s.smtp_port || 587),
      secure: Boolean(s.smtp_secure),
      auth: {
        user: s.smtp_user,
        pass: s.smtp_password || undefined,
      },
    });
    const recipient = to || s.contact_email || s.smtp_from_email || s.smtp_user;
    if (!recipient) throw new AppError('No recipient email', 400);

    await transporter.sendMail({
      from: `"${s.smtp_from_name || 'Scholar Store'}" <${s.smtp_from_email || s.smtp_user}>`,
      to: recipient,
      subject: 'Scholar Store — test email',
      text: 'This is a test email from Scholar Store Admin Settings.',
    });

    res.json({ success: true, message: `Test email sent to ${recipient}` });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  uploadLogo,
  sendTestEmail,
  updateSchema,
};
