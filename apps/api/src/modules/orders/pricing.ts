import { BadRequestException } from '@nestjs/common';
import { lineTotal } from '@foodhub/shared';

export interface PricingProduct {
  id: string;
  name: string;
  basePrice: number;
  isAvailable: boolean;
  optionGroups: {
    id: string;
    name: string;
    isRequired: boolean;
    maxSelect: number;
    options: { id: string; name: string; extraPrice: number }[];
  }[];
}

export interface PricedLine {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  optionsSnapshot: { group: string; name: string; extraPrice: number }[];
  lineTotal: number;
}

/**
 * Tính giá từng dòng từ dữ liệu CSDL — không dùng giá client gửi lên.
 * Ném lỗi nếu món hết, tùy chọn không thuộc món, thiếu nhóm bắt buộc hoặc chọn quá số lượng.
 */
export function priceLines(
  items: { productId: string; quantity: number; optionIds: string[] }[],
  products: Map<string, PricingProduct>,
): { lines: PricedLine[]; subtotal: number } {
  const lines = items.map((item) => {
    const product = products.get(item.productId);
    if (!product) throw new BadRequestException('Có món không còn tồn tại, vui lòng cập nhật giỏ hàng');
    if (!product.isAvailable) throw new BadRequestException(`"${product.name}" đã hết món`);

    const selected = new Set(item.optionIds);
    const snapshot: PricedLine['optionsSnapshot'] = [];
    let extra = 0;

    for (const group of product.optionGroups) {
      const picked = group.options.filter((o) => selected.has(o.id));
      if (group.isRequired && picked.length === 0) {
        throw new BadRequestException(`Vui lòng chọn ${group.name.toLowerCase()} cho "${product.name}"`);
      }
      if (picked.length > group.maxSelect) {
        throw new BadRequestException(`${group.name} của "${product.name}" chọn tối đa ${group.maxSelect}`);
      }
      for (const o of picked) {
        selected.delete(o.id);
        extra += o.extraPrice;
        snapshot.push({ group: group.name, name: o.name, extraPrice: o.extraPrice });
      }
    }
    if (selected.size > 0) throw new BadRequestException(`Tùy chọn không hợp lệ cho "${product.name}"`);

    const unitPrice = product.basePrice + extra;
    return {
      productId: product.id,
      productName: product.name,
      unitPrice,
      quantity: item.quantity,
      optionsSnapshot: snapshot,
      lineTotal: lineTotal(unitPrice, item.quantity),
    };
  });
  return { lines, subtotal: lines.reduce((sum, l) => sum + l.lineTotal, 0) };
}
