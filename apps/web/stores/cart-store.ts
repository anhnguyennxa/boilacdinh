import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CartOption {
  id: string;
  group: string;
  name: string;
  extraPrice: number;
}

export interface CartItem {
  /** productId + danh sách option đã sắp xếp: cùng món cùng tùy chọn thì gộp dòng */
  key: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  categorySlug: string;
  basePrice: number;
  quantity: number;
  options: CartOption[];
}

export const unitPrice = (item: Pick<CartItem, 'basePrice' | 'options'>) =>
  item.basePrice + item.options.reduce((s, o) => s + o.extraPrice, 0);

export const itemKey = (productId: string, optionIds: string[]) => `${productId}:${[...optionIds].sort().join(',')}`;

interface CartState {
  /** Giỏ đang hiển thị (thuộc về `owner`) */
  items: CartItem[];
  couponCode: string | null;
  /** GUEST hoặc id tài khoản sở hữu giỏ đang hiển thị */
  owner: string;
  /** Giỏ của các chủ khác đang được cất — hiện lại khi người đó đăng nhập lại */
  stash: Record<string, StoredCart>;
  drawerOpen: boolean;
  add: (item: Omit<CartItem, 'key'>) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
  /**
   * Đổi chủ giỏ khi phiên đăng nhập thay đổi. Giỏ hiện tại được cất cho chủ cũ, giỏ của chủ mới được lấy ra.
   * mergeCurrent: gộp giỏ đang có vào giỏ chủ mới (khách vãng lai vừa đăng nhập) thay vì cất đi.
   */
  switchOwner: (owner: string, opts?: { mergeCurrent?: boolean }) => void;
}

export const GUEST = 'guest';
/** Giỏ lưu từ phiên bản cũ, không rõ thuộc tài khoản nào */
const LEGACY = 'legacy';

interface StoredCart {
  items: CartItem[];
  couponCode: string | null;
}

/** Gộp hai giỏ: cùng món cùng tùy chọn thì cộng số lượng (tối đa 50). */
export function mergeItems(base: CartItem[], extra: CartItem[]): CartItem[] {
  const merged = base.map((i) => ({ ...i }));
  for (const item of extra) {
    const same = merged.find((i) => i.key === item.key);
    if (same) same.quantity = Math.min(50, same.quantity + item.quantity);
    else merged.push({ ...item });
  }
  return merged;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      owner: GUEST,
      stash: {},
      drawerOpen: false,
      switchOwner: (owner, opts) =>
        set((s) => {
          if (owner === s.owner) return {};
          const stash = { ...s.stash };
          let target = stash[owner] ?? { items: [], couponCode: null };
          delete stash[owner];
          if (owner !== GUEST && stash[LEGACY]) {
            target = { items: mergeItems(target.items, stash[LEGACY].items), couponCode: target.couponCode ?? stash[LEGACY].couponCode };
            delete stash[LEGACY];
          }
          if (opts?.mergeCurrent) {
            return {
              owner,
              stash,
              items: mergeItems(target.items, s.items),
              couponCode: s.couponCode ?? target.couponCode,
              drawerOpen: false,
            };
          }
          if (s.items.length || s.couponCode) stash[s.owner] = { items: s.items, couponCode: s.couponCode };
          return { owner, stash, items: target.items, couponCode: target.couponCode, drawerOpen: false };
        }),
      add: (item) =>
        set((s) => {
          const key = itemKey(item.productId, item.options.map((o) => o.id));
          const existing = s.items.find((i) => i.key === key);
          const items = existing
            ? s.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(50, i.quantity + item.quantity) } : i))
            : [...s.items, { ...item, key }];
          return { items };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          items:
            quantity <= 0
              ? s.items.filter((i) => i.key !== key)
              : s.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(50, quantity) } : i)),
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [], couponCode: null }),
      setCoupon: (couponCode) => set({ couponCode }),
      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
    }),
    {
      name: 'foodhub-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, couponCode: s.couponCode, owner: s.owner, stash: s.stash }),
      skipHydration: true,
      version: 1,
      // Bản 0 chỉ có một giỏ dùng chung, không biết của ai → cất riêng (LEGACY) thay vì hiện cho khách;
      // người đăng nhập tiếp theo trên máy này nhận lại các món đó
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<StoredCart>;
        if (version < 1) {
          const stash = old.items?.length ? { [LEGACY]: { items: old.items, couponCode: old.couponCode ?? null } } : {};
          return { items: [], couponCode: null, owner: GUEST, stash };
        }
        return persisted as CartState;
      },
    },
  ),
);

export const selectCount = (s: CartState) => s.items.reduce((n, i) => n + i.quantity, 0);
export const selectSubtotal = (s: CartState) => s.items.reduce((n, i) => n + unitPrice(i) * i.quantity, 0);
