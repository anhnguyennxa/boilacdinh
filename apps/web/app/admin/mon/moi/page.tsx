import { AdminOnly } from '@/components/admin/admin-only';
import { ProductForm } from '@/components/admin/product-form';

export default function NewProductPage() {
  return (
    <AdminOnly>
      <h1 className="mb-4 text-2xl font-semibold">Thêm món</h1>
      <ProductForm />
    </AdminOnly>
  );
}
