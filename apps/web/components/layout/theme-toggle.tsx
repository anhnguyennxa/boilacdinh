'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const NEXT: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<ThemeMode, string> = { system: 'Theo hệ thống', light: 'Sáng', dark: 'Tối' };
const ICON = { system: Monitor, light: Sun, dark: Moon };

/** Bấm để xoay vòng: theo hệ thống → sáng → tối. */
export function ThemeToggle({ className, showLabel }: { className?: string; showLabel?: boolean }) {
  const { mode, setMode } = useTheme();
  const Icon = ICON[mode];
  return (
    <button
      type="button"
      onClick={() => setMode(NEXT[mode])}
      title={`Giao diện: ${LABEL[mode]} (bấm để đổi sang ${LABEL[NEXT[mode]].toLowerCase()})`}
      aria-label={`Giao diện: ${LABEL[mode]}. Bấm để đổi sang ${LABEL[NEXT[mode]].toLowerCase()}`}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Icon key={mode} className="size-4 animate-pop-in" />
      {showLabel && <span>{LABEL[mode]}</span>}
    </button>
  );
}
