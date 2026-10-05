import { useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Order } from '@/types'

export interface ZReadingProps {
  type: 'Z-Reading' | 'X-Reading'
  periodLabel: string
  orders: Order[]
  cashierName?: string
  openingFloat?: number
  closingCash?: number
  onClose: () => void
}

export default function ZReadingModal({
  type,
  periodLabel,
  orders,
  cashierName = 'All Staff / Register 1',
  openingFloat = 1000,
  closingCash,
  onClose,
}: ZReadingProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const completedOrders = orders.filter(o => o.status === 'completed')
  const voidOrders = orders.filter(o => o.status === 'void')

  const totalGrossSales = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const totalSubtotal = completedOrders.reduce((sum, o) => sum + Number(o.subtotal), 0)
  const totalVat = completedOrders.reduce((sum, o) => sum + Number(o.vat_amount), 0)

  // Payment Breakdown
  const cashOrders = completedOrders.filter(o => o.payment_method === 'cash')
  const gcashOrders = completedOrders.filter(o => o.payment_method === 'gcash')
  const cardOrders = completedOrders.filter(o => o.payment_method === 'card')

  const cashSales = cashOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const gcashSales = gcashOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const cardSales = cardOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)

  // Items count
  let totalItemsSold = 0
  for (const o of completedOrders) {
    if (o.order_items) {
      for (const item of o.order_items) {
        totalItemsSold += item.quantity
      }
    }
  }

  const expectedCashInDrawer = openingFloat + cashSales
  const hasCashCount = closingCash !== undefined && closingCash !== null
  const cashDifference = hasCashCount ? closingCash - expectedCashInDrawer : null

  function handlePrint() {
    window.print()
  }

  const generatedTime = new Date().toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card)',
          borderRadius: 14,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--muted)',
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                background: type === 'Z-Reading' ? '#ea580c' : '#2563eb',
                color: '#fff',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {type}
            </span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
              {type === 'Z-Reading' ? 'End-of-Day Register Report' : 'Shift / Snapshot Reading'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: 'var(--muted-foreground)',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Printable Thermal Receipt Slip Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div
            ref={printRef}
            id="printable-reading-slip"
            style={{
              background: '#fff',
              color: '#000',
              padding: '24px 20px',
              borderRadius: 8,
              fontFamily: '"DM Mono", monospace',
              fontSize: 12,
              lineHeight: 1.5,
              border: '1px dashed #cbd5e1',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.05em', color: '#ea580c' }}>
                WINGTRACK
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                Integrated POS & Inventory Systems
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                ======================================
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, margin: '4px 0' }}>
                *** {type.toUpperCase()} REPORT ***
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                {type === 'Z-Reading' ? '(FINAL END-OF-DAY CLOSING)' : '(MID-SHIFT SNAPSHOT)'}
              </div>
            </div>

            {/* Metadata */}
            <div style={{ fontSize: 11, borderBottom: '1px dashed #94a3b8', paddingBottom: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Date & Time:</span>
                <span>{generatedTime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Period Scope:</span>
                <span>{periodLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cashier / Staff:</span>
                <span style={{ fontWeight: 600 }}>{cashierName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Terminal / POS:</span>
                <span>Station #1</span>
              </div>
            </div>

            {/* Sales Summary */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 4 }}>
                SALES TOTALS
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Gross Sales:</span>
                <span style={{ fontWeight: 700 }}>&#8369;{totalGrossSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Net Sales (excl VAT):</span>
                <span>&#8369;{totalSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>12% VAT Amount:</span>
                <span>&#8369;{totalVat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 4 }}>
                PAYMENT BREAKDOWN
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cash ({cashOrders.length} txns):</span>
                <span>&#8369;{cashSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>GCash / Maya ({gcashOrders.length} txns):</span>
                <span>&#8369;{gcashSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Credit / Debit Card ({cardOrders.length} txns):</span>
                <span>&#8369;{cardSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Drawer Cash Reconciliation */}
            <div style={{ marginBottom: 12, background: '#f8fafc', padding: 8, borderRadius: 4 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #cbd5e1', paddingBottom: 2, marginBottom: 4 }}>
                CASH RECONCILIATION
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Beginning Float:</span>
                <span>&#8369;{openingFloat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>+ Cash Sales:</span>
                <span>&#8369;{cashSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px dashed #cbd5e1', paddingTop: 2 }}>
                <span>Expected In Drawer:</span>
                <span>&#8369;{expectedCashInDrawer.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>

              {hasCashCount && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span>Actual Counted Cash:</span>
                    <span style={{ fontWeight: 700 }}>&#8369;{closingCash?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      color: (cashDifference ?? 0) < 0 ? '#b91c1c' : (cashDifference ?? 0) > 0 ? '#15803d' : '#000',
                    }}
                  >
                    <span>Over / (Short):</span>
                    <span>
                      {(cashDifference ?? 0) >= 0 ? '+' : ''}
                      &#8369;{(cashDifference ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Counts & Statistics */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 4 }}>
                ORDER METRICS
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Completed Orders:</span>
                <span style={{ fontWeight: 700 }}>{completedOrders.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Items Sold:</span>
                <span>{totalItemsSold} pcs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Average Basket:</span>
                <span>
                  &#8369;
                  {completedOrders.length > 0
                    ? (totalGrossSales / completedOrders.length).toFixed(2)
                    : '0.00'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                <span>Voided Orders:</span>
                <span>{voidOrders.length}</span>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px dashed #94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                <div style={{ textAlign: 'center', width: '45%' }}>
                  <div style={{ borderBottom: '1px solid #000', height: 26 }} />
                  <span style={{ fontSize: 10, color: '#475569' }}>Cashier Signature</span>
                </div>
                <div style={{ textAlign: 'center', width: '45%' }}>
                  <div style={{ borderBottom: '1px solid #000', height: 26 }} />
                  <span style={{ fontSize: 10, color: '#475569' }}>Manager Signature</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 16 }}>
                *** END OF READING ***
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 10,
            background: 'var(--muted)',
          }}
        >
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            style={{ flex: 1, padding: '9px', fontSize: 13 }}
          >
            Close
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handlePrint}
            style={{
              flex: 1.5,
              padding: '9px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print Reading Slip
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
