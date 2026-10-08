'use client';

import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 5 * 1024 * 1024;

/** Chọn hoặc kéo-thả ảnh → POST /admin/uploads → trả URL cho form. Server kiểm tra lại loại file thật. */
export function ImageUpload({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return toast.error('Chỉ nhận ảnh JPG, PNG hoặc WebP');
    if (file.size > MAX) return toast.error('Ảnh tối đa 5MB');
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const { url } = await api<{ url: string }>('/admin/uploads', { method: 'POST', body: form });
      onChange(url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files[0]);
        }}
        className={cn(
          'relative grid size-32 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed bg-background text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-foreground',
          dragging ? 'border-primary bg-primary-soft' : 'border-border-strong',
        )}
        aria-label={value ? 'Đổi ảnh món' : 'Tải ảnh món'}
      >
        {value ? (
          <Image src={value} alt="" fill sizes="128px" className="object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs">
            <ImagePlus className="size-6" />
            Chọn hoặc kéo ảnh
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="size-6 animate-spin text-foreground" />
          </span>
        )}
      </button>
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>JPG, PNG hoặc WebP, tối đa 5MB. Nên dùng ảnh ngang 4:3, tối thiểu 1200px.</p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-danger transition-colors duration-150 hover:underline"
          >
            <Trash2 className="size-3.5" /> Gỡ ảnh
          </button>
        )}
      </div>
      <input ref={input} type="file" accept={ACCEPT.join(',')} className="sr-only" tabIndex={-1} onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  );
}
