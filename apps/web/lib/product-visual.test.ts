import { describe, expect, it } from 'vitest';
import { productVisual } from './product-visual';

describe('productVisual', () => {
  it.each([
    ['Bánh mì thịt nướng', '🥖'],
    ['Mì xào hải sản', '🍜'],
    ['Phở bò tái nạm', '🍜'],
    ['Cơm gà xối mỡ', '🍛'],
    ['Trà sữa ô long', '🥤'],
    ['Trà đào cam sả', '🍑'],
    ['Món lạ', '🍽️'],
  ])('%s → %s', (name, emoji) => {
    expect(productVisual(name).emoji).toBe(emoji);
  });
});
