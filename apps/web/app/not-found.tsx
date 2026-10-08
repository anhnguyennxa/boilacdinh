import Link from 'next/link';
import { ShopShell } from '@/components/layout/shop-shell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/misc';

export default function NotFound() {
  return (
    <ShopShell>
      <div className="py-16">
        <EmptyState
          emoji="🍽️"
          title="Không tìm thấy trang"
          description="Món này có thể đã ngừng bán hoặc đường dẫn không đúng."
          action={
            <Button asChild>
              <Link href="/thuc-don">Về thực đơn</Link>
            </Button>
          }
        />
      </div>
    </ShopShell>
  );
}
