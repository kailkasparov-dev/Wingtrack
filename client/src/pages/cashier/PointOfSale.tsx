import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { apiCheckout } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { Product, ProductCategory, CartItem, Order } from '@/types'
import ReceiptModal from '@/components/receipt/ReceiptModal'
import CashPaymentCalculator from '@/components/cashier/CashPaymentCalculator'
import PayMongoModal from '@/components/cashier/PayMongoModal'

const DEFAULT_CATS = ['All', 'Wings', 'Sizzling', 'Silog', 'Shake', 'Burger', 'Fries & Pure Cheesestick']

const FALLBACK_PRODUCTS: Product[] = [
  // Wings
  { id: 'p-1', name: 'Classic Buffalo Wings', price: 199, is_available: true, category_id: 'c-wings', category: { id: 'c-wings', name: 'Wings', sort_order: 1 } },
  { id: 'p-2', name: 'Honey Garlic Wings', price: 199, is_available: true, category_id: 'c-wings', category: { id: 'c-wings', name: 'Wings', sort_order: 1 } },
  { id: 'p-3', name: 'Spicy Sriracha Wings', price: 199, is_available: true, category_id: 'c-wings', category: { id: 'c-wings', name: 'Wings', sort_order: 1 } },
  { id: 'p-4', name: 'BBQ Smokey Wings', price: 199, is_available: true, category_id: 'c-wings', category: { id: 'c-wings', name: 'Wings', sort_order: 1 } },
  { id: 'p-5', name: 'Lemon Pepper Wings', price: 199, is_available: true, category_id: 'c-wings', category: { id: 'c-wings', name: 'Wings', sort_order: 1 } },
  { id: 'p-6', name: 'Party Bucket (20pcs)', price: 599, is_available: true, category_id: 'c-wings', category: { id: 'c-wings', name: 'Wings', sort_order: 1 } },

  // Sizzling
  { id: 'p-7', name: 'Sizzling Pork Sisig', price: 189, is_available: true, category_id: 'c-sizzling', category: { id: 'c-sizzling', name: 'Sizzling', sort_order: 2 } },
  { id: 'p-8', name: 'Sizzling Chicken Steak', price: 179, is_available: true, category_id: 'c-sizzling', category: { id: 'c-sizzling', name: 'Sizzling', sort_order: 2 } },
  { id: 'p-9', name: 'Sizzling Beef Tapa', price: 199, is_available: true, category_id: 'c-sizzling', category: { id: 'c-sizzling', name: 'Sizzling', sort_order: 2 } },
  { id: 'p-10', name: 'Sizzling Pork Chop', price: 169, is_available: true, category_id: 'c-sizzling', category: { id: 'c-sizzling', name: 'Sizzling', sort_order: 2 } },

  // Silog
  { id: 'p-11', name: 'Tapsilog Special', price: 149, is_available: true, category_id: 'c-silog', category: { id: 'c-silog', name: 'Silog', sort_order: 3 } },
  { id: 'p-12', name: 'Tocilog Delight', price: 139, is_available: true, category_id: 'c-silog', category: { id: 'c-silog', name: 'Silog', sort_order: 3 } },
  { id: 'p-13', name: 'Chicksilog Wing Meal', price: 149, is_available: true, category_id: 'c-silog', category: { id: 'c-silog', name: 'Silog', sort_order: 3 } },
  { id: 'p-14', name: 'Bangsilog Supreme', price: 159, is_available: true, category_id: 'c-silog', category: { id: 'c-silog', name: 'Silog', sort_order: 3 } },
  { id: 'p-15', name: 'Longsilog Classic', price: 129, is_available: true, category_id: 'c-silog', category: { id: 'c-silog', name: 'Silog', sort_order: 3 } },

  // Shake
  { id: 'p-16', name: 'Fresh Mango Shake', price: 89, is_available: true, category_id: 'c-shake', category: { id: 'c-shake', name: 'Shake', sort_order: 4 } },
  { id: 'p-17', name: 'Strawberry Milkshake', price: 89, is_available: true, category_id: 'c-shake', category: { id: 'c-shake', name: 'Shake', sort_order: 4 } },
  { id: 'p-18', name: 'Rich Chocolate Shake', price: 89, is_available: true, category_id: 'c-shake', category: { id: 'c-shake', name: 'Shake', sort_order: 4 } },
  { id: 'p-19', name: 'House Blend Iced Tea', price: 45, is_available: true, category_id: 'c-shake', category: { id: 'c-shake', name: 'Shake', sort_order: 4 } },
  { id: 'p-20', name: 'Bottomless Soda', price: 65, is_available: true, category_id: 'c-shake', category: { id: 'c-shake', name: 'Shake', sort_order: 4 } },

  // Burger
  { id: 'p-21', name: 'Classic Beef Burger', price: 119, is_available: true, category_id: 'c-burger', category: { id: 'c-burger', name: 'Burger', sort_order: 5 } },
  { id: 'p-22', name: 'Cheesy Bacon Burger', price: 159, is_available: true, category_id: 'c-burger', category: { id: 'c-burger', name: 'Burger', sort_order: 5 } },
  { id: 'p-23', name: 'Crispy Chicken Burger', price: 149, is_available: true, category_id: 'c-burger', category: { id: 'c-burger', name: 'Burger', sort_order: 5 } },
  { id: 'p-24', name: 'Double Smash Burger', price: 189, is_available: true, category_id: 'c-burger', category: { id: 'c-burger', name: 'Burger', sort_order: 5 } },

  // Fries & Pure Cheesestick
  { id: 'p-25', name: 'Pure Mozzarella Cheesesticks (6pcs)', price: 129, is_available: true, category_id: 'c-sticks', category: { id: 'c-sticks', name: 'Fries & Pure Cheesestick', sort_order: 6 } },
  { id: 'p-26', name: 'Crispy Golden Fries', price: 79, is_available: true, category_id: 'c-sticks', category: { id: 'c-sticks', name: 'Fries & Pure Cheesestick', sort_order: 6 } },
  { id: 'p-27', name: 'Loaded Cheese Fries', price: 99, is_available: true, category_id: 'c-sticks', category: { id: 'c-sticks', name: 'Fries & Pure Cheesestick', sort_order: 6 } },
  { id: 'p-28', name: 'Cheesestick & Fries Combo', price: 169, is_available: true, category_id: 'c-sticks', category: { id: 'c-sticks', name: 'Fries & Pure Cheesestick', sort_order: 6 } },
]

export default function PointOfSale() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATS)
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [method, setMethod] = useState<'cash' | 'online'>('cash')
  const [notes, setNotes] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [orderNum, setOrderNum] = useState<number | null>(null)
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCashCalc, setShowCashCalc] = useState(false)
  const [showPayMongo, setShowPayMongo] = useState(false)
  const [lastCashReceived, setLastCashReceived] = useState<number | null>(null)
  const [lastChangeGiven, setLastChangeGiven] = useState<number | null>(null)
  const [showVoidConfirm, setShowVoidConfirm] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      const [prodsRes, catsRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, category:product_categories(id, name, sort_order)')
          .eq('is_available', true)
          .order('name'),
        supabase
          .from('product_categories')
          .select('name')
          .order('sort_order'),
      ])

      if (prodsRes.data && prodsRes.data.length > 0) {
        setProducts(prodsRes.data as Product[])
      } else {
        setProducts(FALLBACK_PRODUCTS)
      }

      if (catsRes.data && catsRes.data.length > 0) {
        setCategories(['All', ...catsRes.data.map(c => c.name)])
      } else {
        setCategories(DEFAULT_CATS)
      }
    } catch {
      setProducts(FALLBACK_PRODUCTS)
      setCategories(DEFAULT_CATS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Handle returning from PayMongo online payment redirect (GCash / Maya QR scan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pmStatus = params.get('paymongo')
    if (pmStatus === 'success') {
      const savedRaw = localStorage.getItem('wingtrack_pending_pos_order')
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw)
          if (saved.cart && saved.cart.length > 0 && profile) {
            setCheckoutLoading(true)
            const chosenMethod = (saved.method === 'gcash' ? 'gcash' : 'card') as 'cash' | 'gcash' | 'card'
            apiCheckout({
              items: saved.cart.map((c: CartItem) => ({ product_id: c.id, quantity: c.qty })),
              payment_method: chosenMethod,
              notes: saved.notes || '',
            }).then(result => {
              setOrderNum(result.order_number)
              setCompletedOrder({
                id: result.id,
                order_number: result.order_number,
                cashier_id: profile.id,
                status: 'completed',
                payment_method: chosenMethod,
                subtotal: saved.subtotal,
                vat_amount: saved.vat,
                total_amount: saved.total,
                notes: saved.notes || '',
                created_at: new Date().toISOString(),
                order_items: saved.cart.map((c: CartItem) => ({
                  id: c.id,
                  order_id: result.id,
                  product_id: c.id,
                  product_name: c.name,
                  unit_price: c.price,
                  quantity: c.qty,
                  line_total: c.price * c.qty,
                })),
              })
              setCheckoutSuccess(true)
              setCart([])
              setNotes('')
              localStorage.removeItem('wingtrack_pending_pos_order')
              window.history.replaceState({}, '', window.location.pathname)
            }).catch(err => {
              setError(err instanceof Error ? err.message : 'Failed to finalize order after payment.')
              localStorage.removeItem('wingtrack_pending_pos_order')
              window.history.replaceState({}, '', window.location.pathname)
            }).finally(() => {
              setCheckoutLoading(false)
            })
          }
        } catch {
          localStorage.removeItem('wingtrack_pending_pos_order')
          window.history.replaceState({}, '', window.location.pathname)
        }
      } else {
        window.history.replaceState({}, '', window.location.pathname)
      }
    } else if (pmStatus === 'cancel') {
      const savedRaw = localStorage.getItem('wingtrack_pending_pos_order')
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw)
          if (saved.cart && saved.cart.length > 0) {
            setCart(saved.cart)
          }
        } catch {
          // ignore
        }
        localStorage.removeItem('wingtrack_pending_pos_order')
      }
      setError('Payment was cancelled on the payment portal.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [profile])

  const filtered = products
    .filter(p => cat === 'All' || (p.category as unknown as ProductCategory)?.name === cat)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  const addItem = (item: Product) => {
    setCart(prev => {
      const exists = prev.find(c => c.id === item.id)
      if (exists) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
  }

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(c => c.id !== id))
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const vat      = Math.round(subtotal * 0.12 * 100) / 100
  const total    = Math.round((subtotal + vat) * 100) / 100

  // When "Charge" is clicked: route to appropriate payment flow
  function handleChargeClick() {
    if (cart.length === 0 || !profile) return
    if (method === 'cash') {
      setShowCashCalc(true)
    } else if (method === 'online') {
      setShowPayMongo(true)
    } else {
      executeCheckout()
    }
  }

  // Called after cash calc confirmation or directly for non-cash methods
  async function executeCheckout(cashReceived?: number, changeGiven?: number) {
    if (cart.length === 0 || !profile) return
    setShowCashCalc(false)
    setCheckoutLoading(true)
    setError(null)

    // Store cash info for the success modal
    if (cashReceived !== undefined && changeGiven !== undefined) {
      setLastCashReceived(cashReceived)
      setLastChangeGiven(changeGiven)
    } else {
      setLastCashReceived(null)
      setLastChangeGiven(null)
    }

    const currentCart = [...cart]
    try {
      const result = await apiCheckout({
        items: currentCart.map(c => ({ product_id: c.id, quantity: c.qty })),
        payment_method: (method === 'online' ? 'card' : 'cash') as 'cash' | 'gcash' | 'card',
        notes,
      })
      setOrderNum(result.order_number)
      setCompletedOrder({
        id: result.id,
        order_number: result.order_number,
        cashier_id: profile.id,
        status: 'completed',
        payment_method: (method === 'online' ? 'card' : 'cash') as 'cash' | 'gcash' | 'card',
        subtotal,
        vat_amount: vat,
        total_amount: total,
        notes,
        created_at: new Date().toISOString(),
        order_items: currentCart.map(c => ({
          id: c.id,
          order_id: result.id,
          product_id: c.id,
          product_name: c.name,
          unit_price: c.price,
          quantity: c.qty,
          line_total: c.price * c.qty,
        })),
      })
      setCheckoutSuccess(true)
      setCart([])
      setNotes('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setCheckoutLoading(false)
    }
  }

  function handleVoid() {
    setShowVoidConfirm(true)
  }

  function confirmVoid() {
    setCart([])
    setNotes('')
    setError(null)
    setShowVoidConfirm(false)
    setMobileCartOpen(false)
  }

  function dismissSuccess() {
    setCheckoutSuccess(false)
    setOrderNum(null)
    setCompletedOrder(null)
    setShowReceipt(false)
    setLastCashReceived(null)
    setLastChangeGiven(null)
    setMobileCartOpen(false)
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: '100%', maxHeight: '100dvh', overflow: 'hidden', position: 'relative' }}>
      {/* Menu Panel */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'clamp(14px, 2.5vw, 28px) clamp(14px, 2.5vw, 32px)' }}>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ fontFamily: 'Fraunces', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>Point of Sale</h1>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
              {new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {profile?.full_name}
            </p>
          </div>

          {/* Search & Category filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              id="pos-search"
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              style={{ width: '100%', maxWidth: 260, padding: '8px 14px', fontSize: 13 }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 2 }}>
              {categories.map(c => (
                <button
                  key={c}
                  id={`pos-cat-${c.toLowerCase()}`}
                  onClick={() => setCat(c)}
                  style={{
                    padding: '6px 14px', borderRadius: 24, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                    border: '1px solid var(--border)', transition: 'all 0.15s',
                    background: cat === c ? 'var(--primary)' : 'var(--card)',
                    color: cat === c ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
              <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'clamp(10px, 1.8vw, 16px)' }}>
              {filtered.map(item => {
                const inCart = cart.find(c => c.id === item.id)
                const catName = (item.category as unknown as ProductCategory)?.name ?? ''
                return (
                  <button
                    key={item.id}
                    id={`pos-item-${item.id}`}
                    onClick={() => addItem(item)}
                    style={{
                      background: inCart ? 'rgba(234,88,12,0.08)' : 'var(--card)',
                      border: `1.5px solid ${inCart ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 12, padding: 'clamp(12px, 2vw, 18px)', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{catName}</p>
                      <p style={{ fontSize: 'clamp(13px, 1.6vw, 16px)', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.25, marginBottom: 12 }}>{item.name}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6 }}>
                      <span style={{ fontSize: 'clamp(14px, 1.8vw, 17px)', fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--primary)' }}>&#8369;{Number(item.price).toFixed(2)}</span>
                      {inCart && <span style={{ fontSize: 11, background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>x{inCart.qty}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Mobile Floating / Sticky Cart Bar */}
        <div className="lg:hidden shrink-0 px-3.5 py-2.5 bg-[var(--card)] border-t border-[var(--border)] shadow-lg z-20">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <span className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-sm border border-orange-500/20">
                  🛒
                </span>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {cart.reduce((s, i) => s + i.qty, 0)}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[var(--muted-foreground)] font-medium leading-tight truncate">
                  {cart.length === 0 ? 'Cart is empty' : `${cart.length} item${cart.length > 1 ? 's' : ''}`}
                </p>
                <p className="font-['Fraunces'] font-bold text-base text-[var(--foreground)] leading-tight">
                  ₱{total.toLocaleString()}
                </p>
              </div>
            </div>
            <button
              id="pos-mobile-cart-toggle"
              onClick={() => setMobileCartOpen(true)}
              className="btn-primary py-2 px-3.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              {cart.length > 0 ? 'Checkout' : 'View Cart'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Cart Drawer Backdrop */}
      {mobileCartOpen && (
        <div
          id="mobile-pos-cart-backdrop"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileCartOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Cart Panel (Drawer on <lg, permanent on lg+) */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] max-w-full
          lg:static lg:w-[380px] xl:w-[420px] lg:z-auto
          transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
          ${mobileCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'var(--sidebar)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: '100%',
          maxHeight: '100dvh',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              id="close-mobile-cart-btn"
              onClick={() => setMobileCartOpen(false)}
              className="lg:hidden"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: 'var(--sidebar-muted)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
              }}
              aria-label="Back to menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Menu
            </button>
            <div>
              <h2 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 600, color: 'var(--sidebar-foreground)' }}>Current Order</h2>
              <p style={{ fontSize: 12, color: 'var(--sidebar-muted)', marginTop: 1, fontFamily: 'DM Mono' }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)' }}>
            <span style={{ fontSize: 10, color: 'var(--sidebar-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', fontFamily: 'DM Mono', fontWeight: 500 }}>Cashier</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sidebar-active)' }}>{profile?.full_name ?? 'Staff'}</span>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 18px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--sidebar-muted)' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 14px', opacity: 0.75 }}>
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--sidebar-foreground)' }}>No items yet</p>
              <p style={{ fontSize: 13, marginTop: 5, color: 'var(--sidebar-muted)' }}>Tap menu items to add</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--sidebar-foreground)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                <p style={{ fontSize: 14, fontFamily: 'DM Mono', color: 'var(--sidebar-active)', marginTop: 3, fontWeight: 500 }}>&#8369;{(item.price * item.qty).toLocaleString()}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button id={`cart-dec-${item.id}`} onClick={() => updateQty(item.id, -1)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.05)', color: 'var(--sidebar-foreground)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                <span style={{ fontSize: 14, fontFamily: 'DM Mono', color: 'var(--sidebar-foreground)', minWidth: 22, textAlign: 'center', fontWeight: 600 }}>{item.qty}</span>
                <button id={`cart-inc-${item.id}`} onClick={() => updateQty(item.id, 1)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.05)', color: 'var(--sidebar-foreground)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                <button
                  id={`cart-remove-${item.id}`}
                  onClick={() => removeItem(item.id)}
                  title="Remove item"
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,100,100,0.25)', background: 'rgba(185,28,28,0.1)', color: '#fca5a5', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', marginLeft: 2 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(185,28,28,0.3)'; (e.currentTarget as HTMLElement).style.color = '#fecaca' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(185,28,28,0.1)'; (e.currentTarget as HTMLElement).style.color = '#fca5a5' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals & Checkout */}
        <div style={{ padding: '14px 20px 18px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {error && (
            <div style={{ background: 'rgba(185,28,28,0.25)', border: '1px solid rgba(185,28,28,0.5)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#fca5a5', marginBottom: 10 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            {[['Subtotal', `\u20B1${subtotal.toLocaleString()}`], ['VAT (12%)', `\u20B1${vat.toLocaleString()}`]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--sidebar-muted)' }}>{k}</span>
                <span style={{ fontSize: 13, fontFamily: 'DM Mono', color: 'var(--sidebar-foreground)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--sidebar-foreground)', fontFamily: 'Fraunces' }}>Total</span>
              <span style={{ fontSize: 19, fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--sidebar-active)' }}>&#8369;{total.toLocaleString()}</span>
            </div>
          </div>

          {/* Notes */}
          <textarea
            className="sidebar-textarea"
            placeholder="Order notes (optional)..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={1}
            style={{
              width: '100%', resize: 'none', marginBottom: 12,
              padding: '10px 12px', borderRadius: 6, height: 40,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--sidebar-foreground)',
              fontSize: 13, fontFamily: 'DM Sans', outline: 'none',
            }}
          />

          {/* Payment method */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {/* Cash */}
            <button
              id="pos-pay-cash"
              onClick={() => setMethod('cash')}
              style={{
                flex: 1, padding: '9px 4px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${method === 'cash' ? 'var(--sidebar-active)' : 'rgba(255,255,255,0.18)'}`,
                background: method === 'cash' ? 'rgba(240,155,58,0.22)' : 'rgba(255,255,255,0.04)',
                color: method === 'cash' ? 'var(--sidebar-active)' : 'var(--sidebar-muted)',
              }}
            >
              Cash
            </button>
            {/* Online payment via PayMongo (Card, GCash, Maya) */}
            <button
              id="pos-pay-online"
              onClick={() => setMethod('online')}
              style={{
                flex: 1, padding: '9px 4px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${method === 'online' ? '#818cf8' : 'rgba(255,255,255,0.18)'}`,
                background: method === 'online' ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)',
                color: method === 'online' ? '#a5b4fc' : 'var(--sidebar-muted)',
              }}
            >
              Online
            </button>
          </div>

          <button
            id="btn-checkout"
            disabled={cart.length === 0 || checkoutLoading}
            onClick={handleChargeClick}
            style={{
              width: '100%', padding: '14px', borderRadius: 8, fontSize: 16, fontWeight: 700,
              cursor: cart.length && !checkoutLoading ? 'pointer' : 'not-allowed',
              background: cart.length ? 'var(--sidebar-active)' : 'rgba(255,255,255,0.08)',
              color: cart.length ? '#1c0f06' : 'rgba(255,255,255,0.45)',
              border: 'none', fontFamily: 'Fraunces', transition: 'all 0.15s',
            }}
          >
            {checkoutLoading
              ? 'Processing...'
              : cart.length
              ? `Charge \u20B1${total.toLocaleString()}`
              : 'Add items to continue'}
          </button>

          {cart.length > 0 && (
            <button
              id="btn-void"
              onClick={handleVoid}
              style={{ width: '100%', marginTop: 8, padding: '9px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, fontSize: 13, color: 'var(--sidebar-muted)', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fca5a5'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(252,165,165,0.3)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)' }}
            >
              Void Order
            </button>
          )}
        </div>
      </div>

      {/* Success Modal — rendered via portal to escape transform containing block */}
      {checkoutSuccess && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) dismissSuccess() }}
        >
          <div className="card fade-in" style={{ padding: '36px 32px', maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>Payment Received</h2>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 4 }}>Order #{orderNum} completed</p>
            {lastCashReceived !== null && lastChangeGiven !== null && (
              <div style={{ background: 'var(--muted)', borderRadius: 10, padding: '14px 18px', margin: '14px 0', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Cash Received</span>
                  <span style={{ fontSize: 14, fontFamily: 'DM Mono', fontWeight: 600, color: 'var(--foreground)' }}>₱{lastCashReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Change Given</span>
                  <span style={{ fontSize: 14, fontFamily: 'DM Mono', fontWeight: 700, color: lastChangeGiven > 0 ? 'var(--success)' : 'var(--foreground)' }}>₱{lastChangeGiven.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 22 }}>Inventory has been updated automatically.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                id="btn-pos-print-receipt"
                onClick={() => setShowReceipt(true)}
                style={{
                  width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
                  borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)',
                  color: 'var(--foreground)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                View / Print Receipt
              </button>
              <button id="btn-new-order" className="btn-primary" onClick={dismissSuccess} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
                New Order
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Void Confirmation Modal */}
      {showVoidConfirm && createPortal(
        <div
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowVoidConfirm(false) }}
        >
          <div className="card fade-in" style={{ padding: '32px 28px', maxWidth: 380, width: '90%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(185,28,28,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>Void Order?</h2>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 22, lineHeight: 1.6 }}>
              This will clear all <strong>{cart.length} item{cart.length !== 1 ? 's' : ''}</strong> from the current order. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                id="btn-void-cancel"
                className="btn-ghost"
                onClick={() => setShowVoidConfirm(false)}
                style={{ flex: 1, padding: '12px' }}
              >
                Cancel
              </button>
              <button
                id="btn-void-confirm"
                onClick={confirmVoid}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                  background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer',
                }}
              >
                Yes, Void Order
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cash Payment Calculator Modal */}
      {showCashCalc && (
        <CashPaymentCalculator
          total={total}
          onConfirm={(cashReceived, change) => executeCheckout(cashReceived, change)}
          onCancel={() => setShowCashCalc(false)}
        />
      )}

      {/* PayMongo Online Payment Modal (Sandbox) */}
      {showPayMongo && (
        <PayMongoModal
          total={total}
          subtotal={subtotal}
          vat={vat}
          notes={notes}
          cartItems={cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty }))}
          orderDescription={`WINGTRACK Order — ${cart.length} item${cart.length !== 1 ? 's' : ''}`}
          onSuccess={(_intentId) => {
            setShowPayMongo(false)
            executeCheckout()
          }}
          onCancel={() => setShowPayMongo(false)}
        />
      )}

      {/* Printable Receipt Modal */}
      {showReceipt && completedOrder && (
        <ReceiptModal order={completedOrder} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  )
}

