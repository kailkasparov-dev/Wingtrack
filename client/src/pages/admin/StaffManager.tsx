import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { apiCreateStaff, apiDeactivateStaff, apiReactivateStaff } from '@/lib/api'
import type { StaffProfile, StaffRole } from '@/types'

const ROLES: { value: StaffRole; label: string }[] = [
  { value: 'cashier',              label: 'Cashier'              },
  { value: 'inventory_personnel', label: 'Inventory Personnel'   },
  { value: 'admin',               label: 'Admin / Manager'       },
]

const roleBadge: Record<StaffRole, { bg: string; color: string }> = {
  admin:               { bg: 'rgba(155,94,40,0.12)', color: '#9b5e28' },
  cashier:             { bg: 'rgba(21,128,61,0.1)',  color: '#15803d' },
  inventory_personnel: { bg: 'rgba(30,64,175,0.1)',  color: '#1d4ed8' },
}

function checkPwd(p: string) {
  return {
    length:    p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    number:    /[0-9]/.test(p),
    special:   /[^A-Za-z0-9]/.test(p),
  }
}

export default function StaffManager() {
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'cashier' as StaffRole })
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Deactivation confirmation modal state
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  const reqs = checkPwd(form.password)
  const allReqsMet = reqs.length && reqs.uppercase && reqs.number && reqs.special

  useEffect(() => {
    if (showModal || deactivateTarget) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [showModal, deactivateTarget])

  async function fetchStaff() {
    const { data } = await supabase
      .from('staff_profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setStaff((data ?? []) as StaffProfile[])
    setLoading(false)
  }

  useEffect(() => { fetchStaff() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!allReqsMet) {
      setFormError('Password must meet all requirements before creating the account.')
      return
    }

    setFormLoading(true)
    try {
      await apiCreateStaff(form)
      setShowModal(false)
      setForm({ full_name: '', email: '', password: '', role: 'cashier' })
      await fetchStaff()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create staff')
    } finally {
      setFormLoading(false)
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return
    setDeactivateLoading(true)
    try {
      await apiDeactivateStaff(deactivateTarget.id)
      setDeactivateTarget(null)
      await fetchStaff()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Deactivation failed')
    } finally {
      setDeactivateLoading(false)
    }
  }

  async function handleReactivate(id: string, name: string) {
    if (!confirm(`Reactivate ${name}? They will regain access to their account.`)) return
    try {
      await apiReactivateStaff(id)
      await fetchStaff()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Reactivation failed')
    }
  }

  const roleLabel: Record<StaffRole, string> = {
    admin: 'Admin / Manager',
    cashier: 'Cashier',
    inventory_personnel: 'Inventory Personnel',
  }

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 28px) clamp(14px, 3vw, 36px)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Fraunces', fontSize: 'clamp(22px, 3vw, 26px)', fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>Staff Manager</h1>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Provision and manage Wingtrack staff accounts</p>
        </div>
        <button
          id="btn-add-staff"
          className="btn-primary"
          onClick={() => setShowModal(true)}
          style={{ padding: '10px 18px', fontSize: 13.5 }}
        >
          + Add Staff Member
        </button>
      </div>

      {/* Staff table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: 680 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 170px 90px 110px', gap: 0, padding: '12px 22px', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                ))}
              </div>
              {staff.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 220px 170px 90px 110px', gap: 0,
                    padding: '16px 22px', borderBottom: i < staff.length - 1 ? '1px solid var(--muted)' : 'none',
                    alignItems: 'center', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{s.full_name}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>ID: {s.id.slice(0, 8)}...</p>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</span>
                  <div>
                    <span style={{
                      fontSize: 12, padding: '4px 11px', borderRadius: 20, fontWeight: 600, display: 'inline-block',
                      background: roleBadge[s.role].bg, color: roleBadge[s.role].color,
                    }}>
                      {roleLabel[s.role]}
                    </span>
                  </div>
                  <div>
                    <span style={{
                      fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 700,
                      background: s.is_active ? '#e8f5e9' : '#f3f4f6', color: s.is_active ? '#15803d' : '#6b7280', display: 'inline-block',
                    }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    {s.is_active ? (
                      <button
                        id={`btn-deactivate-${s.id}`}
                        onClick={() => setDeactivateTarget({ id: s.id, name: s.full_name })}
                        style={{
                          fontSize: 12, padding: '5px 12px', borderRadius: 6,
                          background: 'transparent', border: '1px solid #fca5a5',
                          color: 'var(--danger)', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        id={`btn-reactivate-${s.id}`}
                        onClick={() => handleReactivate(s.id, s.full_name)}
                        style={{
                          fontSize: 12, padding: '5px 12px', borderRadius: 6,
                          background: 'transparent', border: '1px solid #86efac',
                          color: '#15803d', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {staff.length === 0 && (
                <p style={{ padding: '40px 24px', fontSize: 14, color: 'var(--muted-foreground)' }}>No staff accounts yet. Add your first staff member above.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="card fade-in" style={{ width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', padding: 'clamp(20px, 4vw, 30px) clamp(16px, 4vw, 26px)', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
            <h2 style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 700, color: 'var(--foreground)', marginBottom: 22 }}>
              Add Staff Member
            </h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label htmlFor="staff-name" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Full Name</label>
                <input
                  id="staff-name" autoFocus className="input" type="text" required
                  placeholder="Maria Santos"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  style={{ padding: '11px 14px', fontSize: 14 }}
                />
              </div>
              <div>
                <label htmlFor="staff-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Email</label>
                <input
                  id="staff-email" className="input" type="email" required
                  placeholder="maria@wingtrack.ph"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{ padding: '11px 14px', fontSize: 14 }}
                />
              </div>
              <div>
                <label htmlFor="staff-password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Temporary Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="staff-password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ width: '100%', padding: '11px 40px 11px 14px', fontSize: 14 }}
                  />
                  <button
                    type="button"
                    id="toggle-staff-password"
                    onClick={() => setShowPassword(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted-foreground)',
                      borderRadius: 4,
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Real-time Password Requirements Checklist */}
                <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--muted)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--muted-foreground)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Password Requirements
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { label: '8+ characters', met: reqs.length },
                      { label: '1 uppercase letter', met: reqs.uppercase },
                      { label: '1 number', met: reqs.number },
                      { label: '1 special character', met: reqs.special },
                    ].map((r, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <span style={{ color: r.met ? '#15803d' : '#9ca3af', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>
                          {r.met ? '✓' : '○'}
                        </span>
                        <span style={{ color: r.met ? '#15803d' : 'var(--muted-foreground)', fontWeight: r.met ? 600 : 400 }}>
                          {r.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="staff-role" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Role</label>
                <select
                  id="staff-role"
                  className="input"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as StaffRole }))}
                  style={{ padding: '11px 14px', fontSize: 14 }}
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {formError && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', fontWeight: 500 }}>
                  {formError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px' }}>Cancel</button>
                <button id="btn-create-staff" type="submit" className="btn-primary" disabled={formLoading || !allReqsMet} style={{ flex: 2, padding: '12px' }}>
                  {formLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Deactivation Confirmation Modal */}
      {deactivateTarget && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget && !deactivateLoading) setDeactivateTarget(null) }}
        >
          <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: '28px 24px', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: 'var(--foreground)' }}>Deactivate Staff Member</h3>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Confirm account deactivation</p>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to deactivate <strong style={{ color: 'var(--foreground)' }}>{deactivateTarget.name}</strong>? They will immediately lose access to sign into the system.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-ghost"
                disabled={deactivateLoading}
                onClick={() => setDeactivateTarget(null)}
                style={{ padding: '10px 16px' }}
              >
                Cancel
              </button>
              <button
                id="confirm-deactivate-btn"
                type="button"
                disabled={deactivateLoading}
                onClick={confirmDeactivate}
                style={{
                  padding: '10px 18px',
                  background: 'var(--danger)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {deactivateLoading ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
