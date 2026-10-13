/** URL trang danh sách món đang xem (có ?page=, ?category=) — sau khi lưu/xóa món quay về đúng chỗ. */
const KEY = 'admin-mon-list-url';

export function rememberListUrl(url: string) {
  try {
    sessionStorage.setItem(KEY, url);
  } catch {
    /* chế độ ẩn danh chặn storage: sau khi lưu sẽ về trang 1 */
  }
}

export function lastListUrl() {
  try {
    return sessionStorage.getItem(KEY) ?? '/admin/mon';
  } catch {
    return '/admin/mon';
  }
}
