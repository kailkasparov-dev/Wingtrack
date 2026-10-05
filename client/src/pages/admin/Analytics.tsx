import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'
import ZReadingModal from '@/components/analytics/ZReadingModal'

const PIE_COLORS = ['#9b5e28', '#c47a2e', '#dba96a', '#ecddd0', '#a16207', '#15803d']
const PERIODS = ['Today', 'Last 30 Days', 'Last 6 Months', 'Last Year'] as const

interface FlavorRank {
  name: string
  orders: number
  revenue: number
  sharePercent: number
}

export default function Analytics() {
  const [period, setPeriod] = useState<typeof PERIODS[number]>('Last 6 Months')
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; orders: number }[]>([])
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; orders: number; revenue: number }[]>([])
  const [wingFlavors, setWingFlavors] = useState<FlavorRank[]>([])
  const [rawOrders, setRawOrders] = useState<Order[]>([])
  const [cogsTotal, setCogsTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Z-Reading / X-Reading modal state
  const [showReading, setShowReading] = useState<'Z-Reading' | 'X-Reading' | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const now = new Date()
      let since: Date
      if (period === 'Today') {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      } else if (period === 'Last 30 Days') {
        since = new Date(now.getTime() - 30 * 86400000)
      } else if (period === 'Last 6 Months') {
        since = new Date(now.getTime() - 180 * 86400000)
      } else {
        since = new Date(now.getTime() - 365 * 86400000)
      }

      // Fetch completed orders with items
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, category:product_categories(name))), cashier:cashier_id(full_name)')
        .eq('status', 'completed')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })

      const orders: Order[] = ordersData ?? []
      setRawOrders(orders)

      // Fetch recipes and inventory unit costs for COGS calculation
      const { data: recipesData } = await supabase
        .from('product_recipes')
        .select('product_id, qty_per_unit, inventory:inventory_id(unit_cost)')

      const productRecipeCostMap = new Map<string, number>()
      if (recipesData) {
        for (const r of recipesData as unknown as Array<{ product_id: string; qty_per_unit: number; inventory?: { unit_cost: number } }>) {
          const unitCost = Number(r.inventory?.unit_cost ?? 0)
          const ingredientCost = Number(r.qty_per_unit) * unitCost
          productRecipeCostMap.set(
            r.product_id,
            (productRecipeCostMap.get(r.product_id) ?? 0) + ingredientCost
          )
        }
      }

      // Chronological aggregation based on period
      if (period === 'Today') {
        const hourMap = new Map<number, { label: string; revenue: number; orders: number }>()
        for (let h = 8; h <= 23; h++) {
          const label = `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`
          hourMap.set(h, { label, revenue: 0, orders: 0 })
        }
        for (const o of orders) {
          const h = new Date(o.created_at).getHours()
          const existing = hourMap.get(h)
          if (existing) {
            existing.revenue += Number(o.total_amount)
            existing.orders += 1
          }
        }
        setMonthlyData(
          Array.from(hourMap.values()).map(item => ({
            month: item.label,
            revenue: Math.round(item.revenue * 100) / 100,
            orders: item.orders,
          }))
        )
      } else if (period === 'Last 30 Days') {
        const dayMap = new Map<string, { label: string; revenue: number; orders: number; timestamp: number }>()
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000)
          const key = d.toISOString().split('T')[0]
          const label = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
          dayMap.set(key, { label, revenue: 0, orders: 0, timestamp: d.getTime() })
        }
        for (const o of orders) {
          const key = new Date(o.created_at).toISOString().split('T')[0]
          const existing = dayMap.get(key)
          if (existing) {
            existing.revenue += Number(o.total_amount)
            existing.orders += 1
          }
        }
        setMonthlyData(
          Array.from(dayMap.values())
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(item => ({ month: item.label, revenue: Math.round(item.revenue * 100) / 100, orders: item.orders }))
        )
      } else {
        const monthMap = new Map<string, { label: string; revenue: number; orders: number; timestamp: number }>()
        const monthsCount = period === 'Last 6 Months' ? 6 : 12
        for (let i = monthsCount - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          const label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' })
          monthMap.set(key, { label, revenue: 0, orders: 0, timestamp: d.getTime() })
        }
        for (const o of orders) {
          const d = new Date(o.created_at)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          const existing = monthMap.get(key)
          if (existing) {
            existing.revenue += Number(o.total_amount)
            existing.orders += 1
          } else {
            const label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' })
            monthMap.set(key, { label, revenue: Number(o.total_amount), orders: 1, timestamp: d.getTime() })
          }
        }
        setMonthlyData(
          Array.from(monthMap.values())
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(item => ({ month: item.label, revenue: Math.round(item.revenue * 100) / 100, orders: item.orders }))
        )
      }

      // Category breakdown & COGS Calculation
      let calculatedCOGS = 0
      const catMap: Record<string, number> = {}
      const prodMap: Record<string, { orders: number; revenue: number }> = {}
      const flavorMap: Record<string, { orders: number; revenue: number }> = {}

      for (const o of orders) {
        for (const item of (o.order_items as unknown as Array<{
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          line_total: number
          products?: { category?: { name: string } }
        }> ?? [])) {
          const cat = item.products?.category?.name ?? 'Other'
          catMap[cat] = (catMap[cat] ?? 0) + item.quantity

          // Accumulate product metrics
          if (!prodMap[item.product_name]) prodMap[item.product_name] = { orders: 0, revenue: 0 }
          prodMap[item.product_name].orders += item.quantity
          prodMap[item.product_name].revenue += Number(item.line_total)

          // COGS computation: use recipe or standard 38% food cost baseline
          const recipeCost = productRecipeCostMap.get(item.product_id)
          const estimatedUnitCost = recipeCost && recipeCost > 0 ? recipeCost : Number(item.unit_price) * 0.38
          calculatedCOGS += estimatedUnitCost * item.quantity

          // Flavor ranking (if product has 'Wing' or category is 'Wings')
          const isWing = cat.toLowerCase() === 'wings' || item.product_name.toLowerCase().includes('wing')
          if (isWing) {
            if (!flavorMap[item.product_name]) flavorMap[item.product_name] = { orders: 0, revenue: 0 }
            flavorMap[item.product_name].orders += item.quantity
            flavorMap[item.product_name].revenue += Number(item.line_total)
          }
        }
      }

      const catTotal = Object.values(catMap).reduce((s, v) => s + v, 0)
      setCategoryData(
        Object.entries(catMap).map(([name, v]) => ({
          name,
          value: catTotal > 0 ? Math.round((v / catTotal) * 100) : 0,
        }))
      )

      setTopProducts(
        Object.entries(prodMap)
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 6)
      )

      // Wing Flavors Leaderboard
      const totalWingOrders = Object.values(flavorMap).reduce((sum, f) => sum + f.orders, 0)
      const rankedFlavors: FlavorRank[] = Object.entries(flavorMap)
        .map(([name, v]) => ({
          name,
          orders: v.orders,
          revenue: v.revenue,
          sharePercent: totalWingOrders > 0 ? Math.round((v.orders / totalWingOrders) * 100) : 0,
        }))
        .sort((a, b) => b.orders - a.orders)

      setWingFlavors(rankedFlavors)
      setCogsTotal(Math.round(calculatedCOGS * 100) / 100)
      setLoading(false)
    }

    fetchData()
  }, [period])

  const totalRev    = monthlyData.reduce((s, m) => s + m.revenue, 0)
  const totalOrd    = monthlyData.reduce((s, m) => s + m.orders, 0)
  const avgOrder    = totalOrd > 0 ? totalRev / totalOrd : 0
  const grossProfit = Math.max(0, totalRev - cogsTotal)
  const grossMarginPercent = totalRev > 0 ? (grossProfit / totalRev) * 100 : 0
  const bestMonth   = monthlyData.reduce((best, m) => m.revenue > (best?.revenue ?? 0) ? m : best, monthlyData[0])

  // CSV Exporter for Orders
  function exportOrdersCSV() {
    if (rawOrders.length === 0) {
      alert('No orders available to export for this period.')
      return
    }

    const headers = [
      'Order ID',
      'Order Number',
      'Date',
      'Time',
      'Cashier',
      'Payment Method',
      'Status',
      'Subtotal (PHP)',
      '12% VAT (PHP)',
      'Total Amount (PHP)',
      'Ordered Items Summary',
    ]

    const rows = rawOrders.map(o => {
      const d = new Date(o.created_at)
      const datePart = d.toLocaleDateString('en-PH')
      const timePart = d.toLocaleTimeString('en-PH')
      const itemsList = (o.order_items ?? [])
        .map(i => `${i.product_name} (x${i.quantity})`)
        .join('; ')

      return [
        `"${o.id}"`,
        `"${o.order_number}"`,
        `"${datePart}"`,
        `"${timePart}"`,
        `"${((o as unknown as { cashier?: { full_name: string } }).cashier?.full_name ?? 'Cashier').replace(/"/g, '""')}"`,
        `"${o.payment_method.toUpperCase()}"`,
        `"${o.status.toUpperCase()}"`,
        Number(o.subtotal).toFixed(2),
        Number(o.vat_amount).toFixed(2),
        Number(o.total_amount).toFixed(2),
        `"${itemsList.replace(/"/g, '""')}"`,
      ]
    })

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wingtrack-sales-${period.toLowerCase().replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '28px 36px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 26, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
            Sales Analytics & Reporting
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
            Financial performance, COGS profit margins, flavor leaderboards, and Z-Readings
          </p>
        </div>

        {/* Action Buttons: Z-Reading, X-Reading, CSV & Periods */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            id="btn-generate-z-reading"
            type="button"
            onClick={() => setShowReading('Z-Reading')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: '#ea580c',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📑 Z-Reading (EOD)
          </button>

          <button
            id="btn-generate-x-reading"
            type="button"
            className="btn-ghost"
            onClick={() => setShowReading('X-Reading')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📊 X-Reading
          </button>

          <button
            id="btn-export-sales-csv"
            type="button"
            className="btn-ghost"
            onClick={exportOrdersCSV}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>

          <div style={{ display: 'flex', gap: 6, borderLeft: '1px solid var(--border)', paddingLeft: 8 }}>
            {PERIODS.map(p => (
              <button
                key={p}
                id={`analytics-period-${p.replace(/\s/g, '-').toLowerCase()}`}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: period === p ? 'var(--primary)' : 'var(--card)',
                  color: period === p ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 }}>
            {[
              { label: 'Total Gross Revenue', val: `\u20B1${(totalRev / 1000).toFixed(1)}k`, note: `${totalOrd} completed transactions`, color: '#9b5e28' },
              { label: 'Cost of Goods Sold (COGS)', val: `\u20B1${(cogsTotal / 1000).toFixed(1)}k`, note: 'Recipe ingredients cost', color: '#b91c1c' },
              { label: 'Gross Profit', val: `\u20B1${(grossProfit / 1000).toFixed(1)}k`, note: `${grossMarginPercent.toFixed(1)}% profit margin`, color: '#15803d' },
              { label: 'Avg Basket Size', val: `\u20B1${avgOrder.toFixed(0)}`, note: `Best: ${bestMonth?.month ?? '-'}`, color: '#c47a2e' },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding: '22px 24px' }}>
                <p style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'DM Mono' }}>{k.label}</p>
                <p style={{ fontFamily: 'Fraunces', fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.val}</p>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 8 }}>{k.note}</p>
              </div>
            ))}
          </div>

          {/* Profit Margin & COGS Breakdown Card */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 22, background: 'var(--card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
                  Cost of Goods Sold (COGS) & Net Margin Efficiency
                </h3>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
                  Calculated against live ingredient unit costs from recipe mapping
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 22, fontFamily: 'DM Mono', fontWeight: 800, color: '#15803d' }}>
                  {grossMarginPercent.toFixed(1)}%
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'block' }}>Net Gross Margin</span>
              </div>
            </div>

            {/* Visual ratio bar */}
            <div style={{ height: 16, borderRadius: 8, overflow: 'hidden', display: 'flex', background: '#e2e8f0', marginBottom: 10 }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, grossMarginPercent))}%`,
                  background: 'linear-gradient(90deg, #15803d, #22c55e)',
                  transition: 'width 0.3s ease',
                }}
                title={`Gross Profit: ${grossMarginPercent.toFixed(1)}%`}
              />
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, 100 - grossMarginPercent))}%`,
                  background: '#f87171',
                  transition: 'width 0.3s ease',
                }}
                title={`COGS Ingredient Cost: ${(100 - grossMarginPercent).toFixed(1)}%`}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted-foreground)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#15803d' }} />
                <span>Gross Profit: <strong>&#8369;{grossProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f87171' }} />
                <span>COGS (Poultry & Sauces): <strong>&#8369;{cogsTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></span>
              </div>
            </div>
          </div>

          {/* Revenue trend + pie */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, marginBottom: 22 }}>
            <div className="card" style={{ padding: '24px 26px' }}>
              <h3 style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 600, marginBottom: 4, color: 'var(--foreground)' }}>
                {period === 'Today' ? 'Hourly Sales Distribution' : 'Revenue Trend'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 18 }}>{period}</p>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="mrev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#c47a2e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#c47a2e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `\u20B1${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'var(--sidebar)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: 'var(--sidebar-muted)', fontSize: 12 }} formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Revenue']} itemStyle={{ color: 'var(--sidebar-foreground)', fontSize: 13 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#c47a2e" strokeWidth={2.5} fill="url(#mrev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: '24px 26px' }}>
              <h3 style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 600, marginBottom: 4, color: 'var(--foreground)' }}>Sales by Category</h3>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 12 }}>% of total units ordered</p>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ background: 'var(--sidebar)', border: 'none', borderRadius: 8, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {categoryData.map((c, i) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: 'var(--foreground)' }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'DM Mono', color: 'var(--muted-foreground)' }}>{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dual Leaderboards: Wing Flavors Ranking + Top Products */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {/* Wing Flavors Leaderboard */}
            <div className="card" style={{ padding: '24px 26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
                    🍗 Wing Flavor Leaderboard
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
                    Most popular wing flavors ranked by orders
                  </p>
                </div>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: '#fff7ed', color: '#ea580c', fontWeight: 700 }}>
                  Signature Wings
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 65px', gap: 10, padding: '0 0 10px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                {['Flavor', 'Sold', 'Revenue', 'Share'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>

              {wingFlavors.map((f, i) => {
                const rankBadge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
                return (
                  <div key={f.name} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 65px', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--muted)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{rankBadge}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--foreground)' }}>{f.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontFamily: 'DM Mono', color: 'var(--foreground)' }}>{f.orders} pcs</span>
                    <span style={{ fontSize: 13, fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--primary)' }}>
                      &#8369;{(f.revenue / 1000).toFixed(1)}k
                    </span>
                    <span style={{ fontSize: 12, fontFamily: 'DM Mono', color: 'var(--muted-foreground)' }}>{f.sharePercent}%</span>
                  </div>
                )
              })}
              {wingFlavors.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', padding: '16px 0' }}>No wing flavor sales recorded.</p>
              )}
            </div>

            {/* Top Products Overall */}
            <div className="card" style={{ padding: '24px 26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
                    Top Overall Menu Items
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
                    Highest grossing menu offerings
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px', gap: 10, padding: '0 0 10px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                {['Item', 'Qty', 'Revenue'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>

              {topProducts.map((p, i) => (
                <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--muted)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontFamily: 'DM Mono', color: 'var(--muted-foreground)', minWidth: 16 }}>{i + 1}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--foreground)' }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontFamily: 'DM Mono', color: 'var(--muted-foreground)' }}>{p.orders}</span>
                  <span style={{ fontSize: 13.5, fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--primary)' }}>
                    &#8369;{(p.revenue / 1000).toFixed(1)}k
                  </span>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', padding: '16px 0' }}>No product data for this period.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Z-Reading or X-Reading Modal */}
      {showReading && (
        <ZReadingModal
          type={showReading}
          periodLabel={period}
          orders={rawOrders}
          cashierName="All Staff Summary"
          onClose={() => setShowReading(null)}
        />
      )}
    </div>
  )
}
