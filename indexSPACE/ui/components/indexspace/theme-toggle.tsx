'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-3 border-l border-ix-border h-full">
        <div className="w-[5px] h-[5px] bg-ix-text-faint" />
        <span className="text-[9px] font-mono text-ix-text-faint uppercase tracking-widest">
          THEME
        </span>
      </div>
    )
  }

  const themeIcon = theme === 'dark' ? '●' : theme === 'light' ? '○' : '◐'
  const themeLabel = theme === 'dark' ? 'DARK' : theme === 'light' ? 'LIGHT' : 'AUTO'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 border-l border-ix-border h-full hover:bg-ix-panel-warm transition-colors outline-none">
          <span className="text-[10px] font-mono text-ix-text-muted leading-none">
            {themeIcon}
          </span>
          <span className="text-[9px] font-mono text-ix-text-faint uppercase tracking-widest">
            {themeLabel}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[140px] bg-ix-panel border-ix-border p-0"
      >
        <div className="px-3 py-2 border-b border-ix-border">
          <span className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase">
            APPEARANCE
          </span>
        </div>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem
            value="system"
            className={cn(
              'px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider cursor-pointer rounded-none',
              'focus:bg-ix-panel-warm focus:text-ix-text',
              theme === 'system' ? 'text-ix-text' : 'text-ix-text-muted'
            )}
          >
            <span className="mr-2">◐</span>
            SYSTEM
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="light"
            className={cn(
              'px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider cursor-pointer rounded-none',
              'focus:bg-ix-panel-warm focus:text-ix-text',
              theme === 'light' ? 'text-ix-text' : 'text-ix-text-muted'
            )}
          >
            <span className="mr-2">○</span>
            LIGHT
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="dark"
            className={cn(
              'px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider cursor-pointer rounded-none',
              'focus:bg-ix-panel-warm focus:text-ix-text',
              theme === 'dark' ? 'text-ix-text' : 'text-ix-text-muted'
            )}
          >
            <span className="mr-2">●</span>
            DARK
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
