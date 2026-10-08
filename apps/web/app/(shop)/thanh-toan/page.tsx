'use client';

import { checkoutFormSchema, shippingFee, type CheckoutFormInput, type CreateOrderInput, type OrderDto } from '@foodhub/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Banknote, Bike, CreditCard, MapPin, Store, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { CouponInput } from '@/components/cart/coupon-input';
import { SummaryRows } from '@/components/cart/order-summary';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { useAuth } from '@/hooks/useAuth';
import { useCart, useCoupon } from '@/hooks/useCart';
import { redirectToPayment, usePaymentMethods } from '@/hooks/usePayment';
import { api } from '@/lib/api-client';
import { cn, formatVnd } from '@/lib/utils';
import { unitPrice, useCartStore } from '@/stores/cart-store';

interface SavedAddress {
  id: string;
  receiverName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

function ChoiceCard({
  active,
  disabled,
  onClick,
  icon: Icon,
  title,
  note,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  note: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:border-border disabled:bg-subtle disabled:text-muted-foreground',
        active ? 'border-primary bg-primary-soft' : 'border-border bg-background hover:border-border-strong',
      )}
    >
      <Icon className={cn('size-5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{note}</span>
      </span>
    </button>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { hydrated, items, subtotal } = useCart();
  const coupon = useCoupon(subtotal);
  const clearCart = useCartStore((s) => s.clear);
  const { status, user } = useAuth();
  const [placing, setPlacing] = useState(false);
  const methods = usePaymentMethods().data;

  const form = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      deliveryType: 'DELIVERY',
      paymentMethod: 'COD',
      customerName: '',
      customerPhone: '',
      address: { street: '', ward: '', district: '', city: 'TP. Hồ Chí Minh' },
      note: '',
    },
  });
  const { register, setValue, handleSubmit, formState } = form;
  const errors = formState.errors;
  const deliveryType = useWatch({ control: form.control, name: 'deliveryType' });
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });

  const addresses = useQuery({
    queryKey: ['addresses'],
    enabled: status === 'authenticated',
    queryFn: () => api<SavedAddress[]>('/users/me/addresses'),
  });

  // Điền sẵn thông tin thành viên và địa chỉ mặc định
  useEffect(() => {
    if (!user) return;
    if (!form.getValues('customerName')) setValue('customerName', user.fullName);
    if (!form.getValues('customerPhone') && user.phone) setValue('customerPhone', user.phone);
  }, [user, form, setValue]);
  useEffect(() => {
    const def = addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0];
    if (def && !form.getValues('address.street')) applyAddress(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses.data]);

  function applyAddress(a: SavedAddress) {
    setValue('address', { street: a.street, ward: a.ward, district: a.district, city: a.city }, { shouldValidate: formState.isSubmitted });
    setValue('customerName', a.receiverName);
    setValue('customerPhone', a.phone);
  }

  const fee = shippingFee(deliveryType, subtotal);
  const discount = coupon.error ? 0 : coupon.discount;
  const total = subtotal - discount + fee;
  const submitLabel = paymentMethod === 'COD' ? 'Đặt món' : 'Đặt & thanh toán';

  async function onSubmit(values: CheckoutFormInput) {
    setPlacing(true);
    const payload: CreateOrderInput = {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, optionIds: i.options.map((o) => o.id) })),
      deliveryType: values.deliveryType,
      paymentMethod: values.paymentMethod,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      address: values.deliveryType === 'DELIVERY' ? values.address : undefined,
      couponCode: coupon.code && !coupon.error ? coupon.code : undefined,
      note: values.note || undefined,
    };
    let order: OrderDto;
    try {
      order = await api<OrderDto>('/orders', { method: 'POST', body: payload });
    } catch (e) {
      toast.error((e as Error).message);
      setPlacing(false);
      return;
    }
    clearCart();
    if (order.paymentMethod === 'COD') {
      toast.success('Đặt món thành công!');
      router.replace(`/don-hang/${order.code}`);
      return;
    }
    try {
      await redirectToPayment(order.id, order.paymentMethod);
    } catch (e) {
      // Đơn đã tạo: đưa khách tới trang đơn để thanh toán lại
      toast.error(`Chưa mở được cổng thanh toán: ${(e as Error).message}`);
      router.replace(`/don-hang/${order.code}`);
    }
  }

  if (!hydrated) {
    return (
      <div className="grid gap-6 pt-6 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (items.length === 0 && !placing) {
    return (
      <div className="pt-10">
        <EmptyState
          emoji="🧾"
          title="Chưa có món để thanh toán"
          action={
            <Button asChild>
              <Link href="/thuc-don">Xem thực đơn</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="pb-28 pt-6 lg:pb-0">
      <h1 className="text-2xl font-semibold">Thanh toán</h1>
      {status === 'guest' && (
        <p className="mt-2 text-sm text-muted-foreground">
          Bạn đang đặt với tư cách khách.{' '}
          <Link href="/dang-nhap?next=/thanh-toan" className="font-semibold text-primary hover:underline">
            Đăng nhập
          </Link>{' '}
          để lưu địa chỉ và xem lại lịch sử đơn.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="font-semibold">1. Hình thức nhận</h2>
            <div role="radiogroup" aria-label="Hình thức nhận" className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                active={deliveryType === 'DELIVERY'}
                onClick={() => setValue('deliveryType', 'DELIVERY')}
                icon={Bike}
                title="Giao tận nơi"
                note={fee || deliveryType !== 'DELIVERY' ? 'Phí 15.000đ, miễn phí từ 200k' : 'Đơn của bạn được miễn phí'}
              />
              <ChoiceCard
                active={deliveryType === 'PICKUP'}
                onClick={() => setValue('deliveryType', 'PICKUP')}
                icon={Store}
                title="Nhận tại quầy"
                note="Không mất phí, nhận sau ~15 phút"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="font-semibold">2. Thông tin {deliveryType === 'DELIVERY' ? 'giao hàng' : 'người nhận'}</h2>

            {deliveryType === 'DELIVERY' && addresses.data && addresses.data.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {addresses.data.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => applyAddress(a)}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground"
                  >
                    <MapPin className="size-3.5 text-muted-foreground" />
                    {a.street}, {a.district}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ tên" error={errors.customerName?.message}>
                <Input autoComplete="name" aria-invalid={!!errors.customerName} {...register('customerName')} />
              </Field>
              <Field label="Số điện thoại" error={errors.customerPhone?.message}>
                <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="09xxxxxxxx" aria-invalid={!!errors.customerPhone} {...register('customerPhone')} />
              </Field>
            </div>

            {deliveryType === 'DELIVERY' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Số nhà, tên đường" error={errors.address?.street?.message} className="sm:col-span-2">
                  <Input autoComplete="street-address" aria-invalid={!!errors.address?.street} {...register('address.street')} />
                </Field>
                <Field label="Phường/Xã" error={errors.address?.ward?.message}>
                  <Input aria-invalid={!!errors.address?.ward} {...register('address.ward')} />
                </Field>
                <Field label="Quận/Huyện" error={errors.address?.district?.message}>
                  <Input aria-invalid={!!errors.address?.district} {...register('address.district')} />
                </Field>
                <Field label="Tỉnh/Thành phố" error={errors.address?.city?.message} className="sm:col-span-2">
                  <Input aria-invalid={!!errors.address?.city} {...register('address.city')} />
                </Field>
              </div>
            )}

            <Field label="Ghi chú cho quán (không bắt buộc)" error={errors.note?.message}>
              <Textarea placeholder="Ví dụ: ít cay, không hành…" {...register('note')} />
            </Field>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="font-semibold">3. Thanh toán</h2>
            <div role="radiogroup" aria-label="Phương thức thanh toán" className="grid gap-3 sm:grid-cols-3">
              <ChoiceCard
                active={paymentMethod === 'COD'}
                onClick={() => setValue('paymentMethod', 'COD')}
                icon={Banknote}
                title="Tiền mặt"
                note={deliveryType === 'DELIVERY' ? 'Trả khi nhận hàng' : 'Trả tại quầy'}
              />
              <ChoiceCard
                active={paymentMethod === 'VNPAY'}
                disabled={!methods?.VNPAY}
                onClick={() => setValue('paymentMethod', 'VNPAY')}
                icon={CreditCard}
                title="VNPay"
                note={methods?.VNPAY ? 'ATM, thẻ quốc tế, QR' : 'Chưa khả dụng'}
              />
              <ChoiceCard
                active={paymentMethod === 'MOMO'}
                disabled={!methods?.MOMO}
                onClick={() => setValue('paymentMethod', 'MOMO')}
                icon={Wallet}
                title="Ví MoMo"
                note={methods?.MOMO ? 'Quét QR bằng app MoMo' : 'Chưa khả dụng'}
              />
            </div>
            {paymentMethod !== 'COD' && methods && (
              <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                Bạn sẽ được chuyển sang cổng {paymentMethod === 'VNPAY' ? 'VNPay' : 'MoMo'} để thanh toán. Đơn chưa thanh toán
                sau {methods.ttlMinutes} phút sẽ tự hủy.
                {methods.mock && ' (Môi trường thử nghiệm: dùng cổng giả lập.)'}
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="font-semibold">Đơn hàng ({items.length} món)</h2>
            <ul className="space-y-3 text-sm">
              {items.map((i) => (
                <li key={i.key} className="flex gap-3">
                  <span className="text-muted-foreground tabular-nums">{i.quantity}×</span>
                  <span className="flex-1">
                    {i.name}
                    {i.options.length > 0 && (
                      <span className="block text-xs text-muted-foreground">{i.options.map((o) => o.name).join(' · ')}</span>
                    )}
                  </span>
                  <span className="tabular-nums">{formatVnd(unitPrice(i) * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <CouponInput discount={coupon.discount} error={coupon.error} checking={coupon.checking} />
            <SummaryRows subtotal={subtotal} discount={discount} shippingFee={fee} total={total} />
            <Button type="submit" size="lg" className="hidden w-full lg:flex" loading={placing}>
              {submitLabel} · {formatVnd(total)}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Giá cuối cùng được xác nhận bởi cửa hàng khi đặt.</p>
          </section>
        </aside>
      </div>

      {/* Nút đặt món trong tầm ngón cái trên mobile */}
      <div className="fixed inset-x-0 bottom-0 z-[2] border-t border-border bg-surface px-4 pt-3 pb-safe lg:hidden">
        <Button type="submit" size="lg" className="w-full" loading={placing}>
          {submitLabel} · {formatVnd(total)}
        </Button>
      </div>
    </form>
  );
}
