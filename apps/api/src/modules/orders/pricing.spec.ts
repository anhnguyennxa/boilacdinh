import { BadRequestException } from '@nestjs/common';
import { priceLines, PricingProduct } from './pricing';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const trasua: PricingProduct = {
  id: ID(1),
  name: 'Trà sữa trân châu',
  basePrice: 35_000,
  isAvailable: true,
  optionGroups: [
    {
      id: ID(10),
      name: 'Size',
      isRequired: true,
      maxSelect: 1,
      options: [
        { id: ID(11), name: 'M', extraPrice: 0 },
        { id: ID(12), name: 'L', extraPrice: 8_000 },
      ],
    },
    {
      id: ID(20),
      name: 'Topping',
      isRequired: false,
      maxSelect: 2,
      options: [
        { id: ID(21), name: 'Trân châu đen', extraPrice: 5_000 },
        { id: ID(22), name: 'Pudding', extraPrice: 7_000 },
        { id: ID(23), name: 'Thạch', extraPrice: 5_000 },
      ],
    },
  ],
};
const products = new Map([[trasua.id, trasua]]);

describe('priceLines', () => {
  it('cộng giá tùy chọn vào đơn giá và nhân số lượng', () => {
    const { lines, subtotal } = priceLines(
      [{ productId: trasua.id, quantity: 2, optionIds: [ID(12), ID(21), ID(22)] }],
      products,
    );
    expect(lines[0].unitPrice).toBe(35_000 + 8_000 + 5_000 + 7_000);
    expect(subtotal).toBe(55_000 * 2);
    expect(lines[0].optionsSnapshot.map((o) => o.name)).toEqual(['L', 'Trân châu đen', 'Pudding']);
  });

  it('báo lỗi khi thiếu nhóm bắt buộc', () => {
    expect(() => priceLines([{ productId: trasua.id, quantity: 1, optionIds: [] }], products)).toThrow(
      BadRequestException,
    );
  });

  it('báo lỗi khi chọn quá max_select', () => {
    expect(() =>
      priceLines([{ productId: trasua.id, quantity: 1, optionIds: [ID(11), ID(21), ID(22), ID(23)] }], products),
    ).toThrow(/tối đa 2/);
  });

  it('báo lỗi khi tùy chọn thuộc món khác', () => {
    expect(() =>
      priceLines([{ productId: trasua.id, quantity: 1, optionIds: [ID(11), ID(99)] }], products),
    ).toThrow(/không hợp lệ/);
  });

  it('báo lỗi khi món đã hết', () => {
    const soldOut = new Map([[trasua.id, { ...trasua, isAvailable: false }]]);
    expect(() => priceLines([{ productId: trasua.id, quantity: 1, optionIds: [ID(11)] }], soldOut)).toThrow(
      /hết món/,
    );
  });
});
