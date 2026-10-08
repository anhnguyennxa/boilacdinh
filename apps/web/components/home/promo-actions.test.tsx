import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '@/stores/cart-store';
import { PromoActions } from './promo-actions';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => useCartStore.setState({ items: [], couponCode: null }));

describe('PromoActions', () => {
  it('"Áp dụng" gắn mã vào giỏ và chuyển sang trạng thái đã áp dụng', () => {
    render(<PromoActions code="CHAOBAN" />);
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng/ }));
    expect(useCartStore.getState().couponCode).toBe('CHAOBAN');
    expect(screen.getByRole('button', { name: /Đã áp dụng/ })).toBeDisabled();
  });

  it('sao chép mã vào clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PromoActions code="GIAM20K" compact />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sao chép mã GIAM20K' }));
    });
    expect(writeText).toHaveBeenCalledWith('GIAM20K');
  });
});
