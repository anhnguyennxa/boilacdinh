import { beforeEach, describe, expect, it } from 'vitest';
import { GUEST, mergeItems, selectCount, selectSubtotal, useCartStore } from './cart-store';

const base = {
  productId: 'p1',
  slug: 'tra-sua',
  name: 'Trà sữa',
  imageUrl: null,
  categorySlug: 'tra-sua',
  basePrice: 35_000,
  quantity: 1,
};
const L = { id: 'o-l', group: 'Size', name: 'L', extraPrice: 8_000 };
const PEARL = { id: 'o-p', group: 'Topping', name: 'Trân châu', extraPrice: 5_000 };

describe('giỏ theo chủ sở hữu', () => {
  const PHO = { ...base, productId: 'p2', slug: 'pho', name: 'Phở', options: [] };
  beforeEach(() => useCartStore.setState({ items: [], couponCode: null, owner: GUEST, stash: {} }));

  it('đăng xuất: giỏ của tài khoản được cất, khách thấy giỏ trống', () => {
    const s = useCartStore.getState();
    s.switchOwner('user-a', { mergeCurrent: true });
    useCartStore.getState().add({ ...base, options: [] });
    useCartStore.getState().setCoupon('CHAOBAN');

    useCartStore.getState().switchOwner(GUEST);
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().couponCode).toBeNull();
  });

  it('đăng nhập lại: giỏ cũ của tài khoản hiện lại', () => {
    useCartStore.getState().switchOwner('user-a', { mergeCurrent: true });
    useCartStore.getState().add({ ...base, options: [] });
    useCartStore.getState().switchOwner(GUEST);
    useCartStore.getState().switchOwner('user-a', { mergeCurrent: true });
    expect(useCartStore.getState().items.map((i) => i.name)).toEqual(['Trà sữa']);
  });

  it('khách có món rồi đăng nhập: gộp vào giỏ tài khoản, cùng món thì cộng số lượng', () => {
    useCartStore.getState().switchOwner('user-a', { mergeCurrent: true });
    useCartStore.getState().add({ ...base, options: [] });
    useCartStore.getState().switchOwner(GUEST);

    useCartStore.getState().add({ ...base, quantity: 2, options: [] });
    useCartStore.getState().add(PHO);
    useCartStore.getState().switchOwner('user-a', { mergeCurrent: true });

    const s = useCartStore.getState();
    expect(s.owner).toBe('user-a');
    expect(selectCount(s)).toBe(4); // 1 + 2 trà sữa, 1 phở
    expect(s.stash[GUEST]).toBeUndefined();
  });

  it('người khác đăng nhập trên cùng máy: không thấy giỏ của người trước', () => {
    useCartStore.getState().switchOwner('user-a', { mergeCurrent: true });
    useCartStore.getState().add({ ...base, options: [] });
    useCartStore.getState().switchOwner('user-b');
    expect(useCartStore.getState().items).toHaveLength(0);
    useCartStore.getState().switchOwner('user-a');
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('dữ liệu bản cũ (một giỏ dùng chung): khách không thấy, người đăng nhập tiếp theo nhận lại', async () => {
    const migrate = useCartStore.persist.getOptions().migrate!;
    const migrated = (await migrate({ items: [{ ...base, key: 'k', options: [] }], couponCode: 'CHAOBAN' }, 0)) as object;
    useCartStore.setState(migrated);
    expect(useCartStore.getState().items).toHaveLength(0);

    useCartStore.getState().switchOwner('user-a', { mergeCurrent: true });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().couponCode).toBe('CHAOBAN');
    expect(Object.keys(useCartStore.getState().stash)).toHaveLength(0);
  });

  it('mergeItems không làm thay đổi mảng gốc', () => {
    const a = [{ ...base, key: 'k', options: [] }];
    mergeItems(a, [{ ...base, key: 'k', quantity: 3, options: [] }]);
    expect(a[0].quantity).toBe(1);
  });
});

describe('cart-store', () => {
  beforeEach(() => useCartStore.setState({ items: [], couponCode: null, owner: GUEST, stash: {} }));

  it('gộp dòng khi cùng món, cùng tùy chọn (không phụ thuộc thứ tự chọn)', () => {
    useCartStore.getState().add({ ...base, options: [L, PEARL] });
    useCartStore.getState().add({ ...base, quantity: 2, options: [PEARL, L] });
    const s = useCartStore.getState();
    expect(s.items).toHaveLength(1);
    expect(selectCount(s)).toBe(3);
    expect(selectSubtotal(s)).toBe((35_000 + 8_000 + 5_000) * 3);
  });

  it('tách dòng khi tùy chọn khác nhau', () => {
    useCartStore.getState().add({ ...base, options: [L] });
    useCartStore.getState().add({ ...base, options: [] });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('số lượng về 0 thì xóa dòng, tối đa 50', () => {
    useCartStore.getState().add({ ...base, options: [] });
    const key = useCartStore.getState().items[0].key;
    useCartStore.getState().setQuantity(key, 99);
    expect(useCartStore.getState().items[0].quantity).toBe(50);
    useCartStore.getState().setQuantity(key, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
