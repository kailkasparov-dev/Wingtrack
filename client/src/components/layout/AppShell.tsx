import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Sidebar, { type Page } from './Sidebar'
import type { StaffRole } from '@/types'

// Lazy page imports
import Dashboard from '@/pages/admin/Dashboard'
import Analytics from '@/pages/admin/Analytics'
import StaffManager from '@/pages/admin/StaffManager'
import MenuManager from '@/pages/admin/MenuManager'
import PointOfSale from '@/pages/cashier/PointOfSale'
import Inventory from '@/pages/inventory/Inventory'
import OrdersList from '@/pages/orders/OrdersList'

const DEFAULT_PAGE: Record<StaffRole, Page> = {
  admin: 'dashboard',
  cashier: 'pos',
  inventory_personnel: 'inventory',
}

/** Which pages each role is allowed to access */
const PAGE_ACCESS: Record<StaffRole, Page[]> = {
  admin: ['dashboard', 'pos', 'orders', 'menu', 'inventory', 'analytics', 'staff'],
  cashier: ['pos'],
  inventory_personnel: ['inventory'],
}

function canAccess(role: StaffRole | null, page: Page): boolean {
  if (!role) return false
  return PAGE_ACCESS[role].includes(page)
}

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  pos: 'Point of Sale',
  orders: 'Transactions',
  menu: 'Menu Items',
  inventory: 'Inventory',
  analytics: 'Analytics',
  staff: 'Staff Manager',
}

export default function AppShell() {
  const { role, profile } = useAuth()
  const [page, setPage] = useState<Page>(role ? DEFAULT_PAGE[role] : 'dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Guard: if the user tries to navigate to a page they don't have access to,
  // redirect them back to their default page.
  useEffect(() => {
    if (role && !canAccess(role, page)) {
      setPage(DEFAULT_PAGE[role])
    }
  }, [role, page])

  const safePage = role && canAccess(role, page) ? page : (role ? DEFAULT_PAGE[role] : 'dashboard')

  // Close sidebar on page change on mobile
  useEffect(() => {
    setSidebarOpen(false)
  }, [safePage])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full overflow-hidden bg-[var(--background)]">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          id="mobile-sidebar-backdrop"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Permanent on lg+, Drawer on <lg) */}
      <Sidebar
        page={safePage}
        setPage={setPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        {/* Mobile Header (Hidden on lg+) */}
        <header className="lg:hidden flex items-center justify-between px-3.5 sm:px-5 py-2.5 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-b border-white/10 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-2.5">
            <button
              id="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              aria-label="Open navigation menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Wingtrack" className="w-7 h-7 rounded-full object-cover border border-orange-500/50 shadow-sm" />
              <span className="font-['Fraunces'] font-bold text-base tracking-tight text-white">WINGTRACK</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--primary)] text-white font-semibold shadow-xs">
              {PAGE_TITLES[safePage]}
            </span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-orange-500 to-amber-600 shadow-xs"
              title={profile?.full_name || 'Staff'}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main
          className="flex-1 min-h-0 w-full"
          style={{
            overflow: safePage === 'pos' ? 'hidden' : 'auto',
            background: 'var(--background)',
          }}
        >
          <div
            className="fade-in w-full"
            key={safePage}
            style={{
              height: '100%',
              minHeight: '100%',
              display: safePage === 'pos' ? 'flex' : 'block',
              flexDirection: 'column',
            }}
          >
            {safePage === 'dashboard'  && <Dashboard />}
            {safePage === 'pos'        && <PointOfSale />}
            {safePage === 'orders'     && <OrdersList />}
            {safePage === 'menu'       && <MenuManager />}
            {safePage === 'inventory'  && <Inventory />}
            {safePage === 'analytics'  && <Analytics />}
            {safePage === 'staff'      && <StaffManager />}
          </div>
        </main>
      </div>
    </div>
  )
}

