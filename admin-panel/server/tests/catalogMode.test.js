const { resolveCatalogMode } = require('../src/services/catalogMode');

describe('resolveCatalogMode', () => {
  test('force overrides win', () => {
    expect(
      resolveCatalogMode({ catalog_override: 'force_kit', kit_status: 'ordered' }, {})
    ).toBe('kit');
    expect(
      resolveCatalogMode({ catalog_override: 'force_individual', kit_status: 'pending' }, {})
    ).toBe('individual');
  });

  test('after_kit_order default rule', () => {
    expect(
      resolveCatalogMode(
        { catalog_override: 'default', kit_status: 'pending' },
        { catalog_switch_rule: 'after_kit_order' }
      )
    ).toBe('kit');
    expect(
      resolveCatalogMode(
        { catalog_override: 'default', kit_status: 'ordered' },
        { catalog_switch_rule: 'after_kit_order' }
      )
    ).toBe('individual');
  });

  test('after_first_login rule', () => {
    expect(
      resolveCatalogMode(
        { catalog_override: 'default', first_login_at: null },
        { catalog_switch_rule: 'after_first_login' }
      )
    ).toBe('kit');
    expect(
      resolveCatalogMode(
        { catalog_override: 'default', first_login_at: new Date() },
        { catalog_switch_rule: 'after_first_login' }
      )
    ).toBe('individual');
  });
});
