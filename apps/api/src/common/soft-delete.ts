import { randomBytes } from 'node:crypto';

/**
 * Dữ liệu khi xóa mềm: gắn deleted_at và đổi slug để trả lại slug cũ (cột unique)
 * cho món/danh mục tạo mới trùng tên. Đơn cũ vẫn giữ tên món đã chụp lúc đặt.
 */
export function softDeleteData(slug: string) {
  return { deletedAt: new Date(), slug: `${slug}--xoa-${randomBytes(3).toString('hex')}` };
}
