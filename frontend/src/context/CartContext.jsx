import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'jamlea_cart_items';

// Read once at mount, not on every render -- a plain function passed to
// useState's lazy-initializer form. Wrapped in try/catch since localStorage
// can throw (private browsing, storage disabled) and a corrupted/foreign
// value stored under this key shouldn't crash the app, just start empty.
function loadStoredItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// The "cart" is a draft quote -- an array of
// { product_id, name, sku, unit_price, quantity }. It only becomes a real
// quote once the customer submits it via POST /quotes. Persisted to
// localStorage (this browser only, never sent anywhere) so a refresh, a
// closed tab, or a session timeout doesn't silently wipe an in-progress
// quote the customer was still building.
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadStoredItems);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full/disabled -- the cart still works for this session,
      // it just won't survive a refresh. Not worth surfacing to the user.
    }
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit_price: product.unit_price,
          quantity,
        },
      ];
    });
  };

  const updateQuantity = (productId, quantity) => {
    setItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i))
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const clearCart = () => setItems([]);

  const totalAmount = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clearCart, totalAmount, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
