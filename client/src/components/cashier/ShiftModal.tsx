import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { CashierShift, ShiftSummaryData } from '@/types'
import { apiOpenShift, apiCloseShift } from '@/lib/api'

interface ShiftModalProps {
  mode: 'open' | 'close'
  activeShift?: CashierShift | null
  cashierName: string
  onClose: () => void
  onSuccess: (summary?: ShiftSummaryData) => void
}

export default function ShiftModal({
  mode,
  activeShift,
  cashierName,
  onClose,
  onSuccess,
}: ShiftModalProps) {
  // Open shift inputs
  const [openingFloat, setOpeningFloat] = useState('1000')
  const [openNotes, setOpenNotes] = useState('')

  // Close shift inputs
  const [closingCash, setClosingCash] = useState('')
  const [closeNotes, setCloseNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const quickFloats = [500, 1000, 1500, 2000]

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const val = parseFloat(openingFloat)
    if (isNaN(val) || val < 0) {
      setError('Please enter a valid starting cash float.')
      setLoading(false)
      return
    }

    try {
      await apiOpenShift({
        opening_float: val,
        notes: openNotes.trim() || undefined,
      })
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open shift.')
    } finally {
      setLoading(false)
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const val = parseFloat(closingCash)
    if (isNaN(val) || val < 0) {
      setError('Please enter the counted cash in drawer.')
      setLoading(false)
      return
    }

    try {
      const res = await apiCloseShift({
        closing_cash: val,
        notes: closeNotes.trim() || undefined,
      })
      onSuccess(res.shift)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to close shift.')
    } finally {
      setLoading(false)
    }
  }

  const expectedCash = activeShift?.expected_cash ?? Number(activeShift?.opening_float ?? 0)
  const enteredCashNum = parseFloat(closingCash) || 0
  const previewDiff = enteredCashNum - expectedCash

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
          maxWidth: 420,
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
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
              {mode === 'open' ? 'Open Cashier Shift' : 'Close Shift & Z-Reading'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>
              Cashier: <strong style={{ color: 'var(--foreground)' }}>{cashierName}</strong>
            </p>
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

        {/* Content */}
        {mode === 'open' ? (
          <form onSubmit={handleOpen} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12.5, color: '#334155' }}>
              Enter the starting cash float (barya / panukli) placed in the cash drawer before accepting orders.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
                Beginning Cash Float (&#8369;)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                className="input"
                value={openingFloat}
                onChange={e => setOpeningFloat(e.target.value)}
                placeholder="1000"
                required
                autoFocus
                style={{ width: '100%', fontSize: 18, fontFamily: 'DM Mono', fontWeight: 700, padding: '10px 12px' }}
              />
            </div>

            {/* Quick float chips */}
            <div style={{ display: 'flex', gap: 8 }}>
              {quickFloats.map(amt => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setOpeningFloat(amt.toString())}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: openingFloat === amt.toString() ? '#ea580c' : 'var(--card)',
                    color: openingFloat === amt.toString() ? '#ffffff' : 'var(--foreground)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  &#8369;{amt}
                </button>
              ))}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>
                Notes / Station Remarks (Optional)
              </label>
              <input
                type="text"
                className="input"
                value={openNotes}
                onChange={e => setOpenNotes(e.target.value)}
                placeholder="e.g. Morning Shift - Station 1"
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>

            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, padding: 10, fontSize: 13 }}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ flex: 1.5, padding: 10, fontSize: 13, background: '#ea580c', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
              >
                {loading ? 'Starting Shift...' : 'Start Shift'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleClose} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Shift snapshot */}
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Beginning Float:</span>
                <span style={{ fontWeight: 600 }}>&#8369;{Number(activeShift?.opening_float ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Cash Sales:</span>
                <span style={{ fontWeight: 600 }}>&#8369;{Number(activeShift?.cash_sales ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: 4, fontWeight: 700 }}>
                <span>Expected In Drawer:</span>
                <span style={{ color: '#0f172a' }}>&#8369;{expectedCash.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
                Actual Counted Cash In Drawer (&#8369;)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                className="input"
                value={closingCash}
                onChange={e => setClosingCash(e.target.value)}
                placeholder="Count physical bills and coins..."
                required
                autoFocus
                style={{ width: '100%', fontSize: 18, fontFamily: 'DM Mono', fontWeight: 700, padding: '10px 12px' }}
              />
            </div>

            {closingCash !== '' && !isNaN(enteredCashNum) && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: previewDiff === 0 ? '#f0fdf4' : previewDiff > 0 ? '#eff6ff' : '#fef2f2',
                  color: previewDiff === 0 ? '#15803d' : previewDiff > 0 ? '#1d4ed8' : '#b91c1c',
                  border: `1px solid ${previewDiff === 0 ? '#bbf7d0' : previewDiff > 0 ? '#bfdbfe' : '#fecaca'}`,
                }}
              >
                <span>{previewDiff === 0 ? 'Exact Match' : previewDiff > 0 ? 'Cash Overage (Sobra):' : 'Cash Shortage (Kulang):'}</span>
                <span>
                  {previewDiff > 0 ? '+' : ''}&#8369;{previewDiff.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>
                End of Shift Notes (Optional)
              </label>
              <input
                type="text"
                className="input"
                value={closeNotes}
                onChange={e => setCloseNotes(e.target.value)}
                placeholder="e.g. End of dinner shift, turnover to night shift"
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>

            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, padding: 10, fontSize: 13 }}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ flex: 1.5, padding: 10, fontSize: 13, background: '#ea580c', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
              >
                {loading ? 'Closing Shift...' : 'Close Shift & Print Slip'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
