function resolveCatalogMode(student, settings) {
  const override = student.individual_override || 'default';
  if (override === 'force_show') return 'individual';
  if (override === 'force_hide') return 'kit';

  const rule = (settings && settings.kit_to_individual_rule) || 'after_kit_order';
  if (rule === 'after_kit_order') {
    return student.kit_status === 'ordered' ? 'individual' : 'kit';
  }
  if (rule === 'after_first_login') {
    return student.isFirstLoginSession ? 'kit' : 'individual';
  }
  return 'kit';
}

module.exports = { resolveCatalogMode };
