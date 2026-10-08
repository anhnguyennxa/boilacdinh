import Image from 'next/image';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

/**
 * Logo tròn của thương hiệu. withName: kèm tên chữ bên cạnh.
 * Khi có tên chữ đi kèm thì ảnh là trang trí (alt rỗng) để trình đọc màn hình không đọc tên hai lần.
 */
export function BrandLogo({
  size = 28,
  withName,
  className,
  nameClassName,
  priority,
}: {
  size?: number;
  withName?: boolean;
  className?: string;
  nameClassName?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Image
        src={BRAND.logo}
        alt={withName ? '' : BRAND.name}
        width={size}
        height={size}
        priority={priority}
        className="shrink-0 rounded-full"
        style={{ width: size, height: size }}
      />
      {withName && <span className={cn('font-semibold tracking-tight', nameClassName)}>{BRAND.name}</span>}
    </span>
  );
}
