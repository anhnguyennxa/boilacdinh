import Image from 'next/image';
import { productVisual } from '@/lib/product-visual';
import { cn } from '@/lib/utils';

export function ProductImage({
  name,
  imageUrl,
  categorySlug,
  className,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
  priority,
  emojiClassName = 'text-6xl',
  fit = 'contain',
  imageClassName,
}: {
  /**
   * contain (mặc định): hiện trọn ảnh, khoảng trống là nền trung tính — ảnh món chụp dọc/ngang đều không bị cắt.
   * cover: phủ kín khung — dùng cho ảnh thu nhỏ (giỏ hàng, bảng admin) nơi viền trống trông rối.
   */
  fit?: 'contain' | 'cover';
  imageClassName?: string;
  name: string;
  imageUrl: string | null;
  categorySlug?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  emojiClassName?: string;
}) {
  if (imageUrl) {
    return (
      <div className={cn('relative overflow-hidden', fit === 'contain' ? 'bg-subtle' : 'bg-muted', className)}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(fit === 'contain' ? 'object-contain' : 'object-cover', imageClassName)}
        />
      </div>
    );
  }
  const { emoji, gradient } = productVisual(name, categorySlug);
  return (
    <div className={cn('relative grid place-items-center overflow-hidden bg-gradient-to-b', gradient, className)}>
      <span role="img" aria-label={name} className={cn('select-none', emojiClassName)}>
        {emoji}
      </span>
    </div>
  );
}
