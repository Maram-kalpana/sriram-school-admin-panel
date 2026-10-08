function parseJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Resolve catalog mode for a student given settings map.
 * @returns {'kit'|'individual'}
 */
function resolveCatalogMode(student, settings = {}) {
  const override = student.catalog_override || 'default';
  if (override === 'force_kit') return 'kit';
  if (override === 'force_individual') return 'individual';

  const rule = settings.catalog_switch_rule || 'after_kit_order';
  if (rule === 'after_first_login') {
    return student.first_login_at ? 'individual' : 'kit';
  }
  // after_kit_order (default)
  return student.kit_status === 'ordered' ? 'individual' : 'kit';
}

async function loadSettingsMap(db) {
  const rows = await db('settings');
  const map = {};
  rows.forEach((r) => {
    map[r.setting_key] = parseJson(r.setting_value);
  });
  return map;
}

module.exports = {
  resolveCatalogMode,
  loadSettingsMap,
  parseJson,
};
