const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveCatalogMode } = require('../src/services/catalogMode');

test('force_show and force_hide win over settings', () => {
  assert.equal(resolveCatalogMode({ individual_override: 'force_show', kit_status: 'pending' }, { kit_to_individual_rule: 'after_kit_order' }), 'individual');
  assert.equal(resolveCatalogMode({ individual_override: 'force_hide', kit_status: 'ordered' }, { kit_to_individual_rule: 'after_kit_order' }), 'kit');
});

test('after_kit_order uses kit_status', () => {
  const s = { kit_to_individual_rule: 'after_kit_order' };
  assert.equal(resolveCatalogMode({ individual_override: 'default', kit_status: 'pending' }, s), 'kit');
  assert.equal(resolveCatalogMode({ individual_override: 'default', kit_status: 'ordered' }, s), 'individual');
});

test('after_first_login uses session flag', () => {
  const s = { kit_to_individual_rule: 'after_first_login' };
  assert.equal(resolveCatalogMode({ individual_override: 'default', isFirstLoginSession: true }, s), 'kit');
  assert.equal(resolveCatalogMode({ individual_override: 'default', isFirstLoginSession: false }, s), 'individual');
});
