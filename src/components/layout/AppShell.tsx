'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTransactions } from '@/hooks/useTransactions'
import { PreferencesDialog } from '@/components/preferences/PreferencesDialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Upload,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Settings,
  Wallet,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const { pendingReviewCount } = useTransactions()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Até logo!')
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analise', label: 'Análise Real', icon: BarChart3 },
    { href: '/transactions', label: 'Transações', icon: ArrowLeftRight },
    { href: '/orcamento', label: 'Orçamento', icon: Wallet },
    { href: '/import', label: 'Importar arquivo', icon: Upload },
    {
      href: '/revisao',
      label: 'Revisão',
      icon: ClipboardList,
      badge: pendingReviewCount > 0 ? pendingReviewCount : null,
    },
  ]

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <TrendingUp className="size-4" />
        </div>
        <span className="font-semibold text-lg">Finanças Raupps</span>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge != null && (
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-xs font-semibold',
                  pathname === href
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-amber-100 text-amber-700',
                )}
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="p-3 space-y-1">
        <button
          onClick={() => { setPrefsOpen(true); setSidebarOpen(false) }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="size-4" />
          Preferências
        </button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-card lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-60 border-r bg-card shadow-lg">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(o => !o)}
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <span className="font-semibold">Finanças Raupps</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
    </div>
  )
}
