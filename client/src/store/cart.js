const KEY = 'school_cart_v1';

export function readCart() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{"type":null,"items":[]}'); } catch { return { type: null, items: [] }; }
}
export function writeCart(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-change'));
}
export function clearCart() {
  writeCart({ type: null, items: [] });
}
