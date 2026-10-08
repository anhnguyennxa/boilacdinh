import { detectImage } from './image-type';

describe('detectImage', () => {
  it('nhận JPEG, PNG, WebP theo magic bytes', () => {
    expect(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.ext).toBe('jpg');
    expect(detectImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.ext).toBe('png');
    expect(detectImage(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]))?.ext).toBe('webp');
  });

  it('từ chối file giả đuôi ảnh (HTML, SVG có script, rỗng)', () => {
    expect(detectImage(Buffer.from('<html><script>alert(1)</script>'))).toBeNull();
    expect(detectImage(Buffer.from('<svg onload="alert(1)"/>'))).toBeNull();
    expect(detectImage(Buffer.alloc(0))).toBeNull();
  });
});
