const { query } = require('../db');

const DEFAULTS = {
  kit_to_individual_rule: 'after_kit_order',
  require_second_factor: 'off',
  shipping_flat_fee: '0',
  school_name: 'Sunrise School',
  school_logo: '',
  allow_address_edit: 'false',
  allow_kit_reorder: 'true',
};

async function getSettings() {
  const rows = await query('SELECT setting_key, setting_value FROM settings');
  const map = { ...DEFAULTS };
  rows.forEach((r) => {
    map[r.setting_key] = r.setting_value;
  });
  return map;
}

async function setSettings(patch) {
  for (const [key, value] of Object.entries(patch)) {
    await query(
      `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, String(value)]
    );
  }
  return getSettings();
}

module.exports = { getSettings, setSettings, DEFAULTS };
