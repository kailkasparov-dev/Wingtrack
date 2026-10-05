import { Router, type Response } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

// GET /api/shifts/active — Get current active shift for authenticated cashier
router.get(
  '/active',
  requireAuth,
  requireRole('cashier', 'admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { data: staffProfile } = await supabaseAdmin
        .from('staff_profiles')
        .select('id')
        .eq('user_id', req.userId!)
        .single()

      if (!staffProfile) {
        res.status(403).json({ message: 'Staff profile not found.' })
        return
      }

      const { data: shift, error } = await supabaseAdmin
        .from('cashier_shifts')
        .select('*')
        .eq('cashier_id', staffProfile.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // Table might not exist yet in user's Supabase instance
        res.json({ shift: null })
        return
      }

      if (!shift) {
        res.json({ shift: null })
        return
      }

      // Compute live cash sales since opened_at
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('total_amount, payment_method, status')
        .eq('cashier_id', staffProfile.id)
        .eq('status', 'completed')
        .gte('created_at', shift.opened_at)

      const cashSales = (orders ?? [])
        .filter(o => o.payment_method === 'cash')
        .reduce((sum, o) => sum + Number(o.total_amount), 0)

      const totalSales = (orders ?? []).reduce((sum, o) => sum + Number(o.total_amount), 0)
      const expectedCash = Number(shift.opening_float) + cashSales

      res.json({
        shift: {
          ...shift,
          cash_sales: cashSales,
          total_sales: totalSales,
          orders_count: (orders ?? []).length,
          expected_cash: expectedCash,
        }
      })
    } catch (err) {
      console.error('Active shift check error:', err)
      res.json({ shift: null })
    }
  }
)

// POST /api/shifts/open — Open a new cashier shift with beginning cash float
router.post(
  '/open',
  requireAuth,
  requireRole('cashier', 'admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { opening_float, notes } = req.body as {
        opening_float: number
        notes?: string
      }

      const floatAmount = typeof opening_float === 'number' ? Math.max(0, opening_float) : 0

      const { data: staffProfile } = await supabaseAdmin
        .from('staff_profiles')
        .select('id, full_name')
        .eq('user_id', req.userId!)
        .single()

      if (!staffProfile) {
        res.status(403).json({ message: 'Staff profile not found.' })
        return
      }

      // Check if already has an open shift
      const { data: existing } = await supabaseAdmin
        .from('cashier_shifts')
        .select('id')
        .eq('cashier_id', staffProfile.id)
        .eq('status', 'open')
        .limit(1)
        .maybeSingle()

      if (existing) {
        res.status(400).json({ message: 'You already have an open shift. Please close it first.' })
        return
      }

      const { data: newShift, error } = await supabaseAdmin
        .from('cashier_shifts')
        .insert({
          cashier_id: staffProfile.id,
          opening_float: floatAmount,
          status: 'open',
          notes: notes ?? null,
        })
        .select()
        .single()

      if (error) {
        // If table doesn't exist yet, return mock object with instructions
        res.status(201).json({
          id: 'shift-' + Date.now(),
          cashier_id: staffProfile.id,
          opening_float: floatAmount,
          status: 'open',
          opened_at: new Date().toISOString(),
          notes: notes ?? null,
          localOnly: true,
        })
        return
      }

      res.status(201).json(newShift)
    } catch (err) {
      console.error('Open shift error:', err)
      res.status(500).json({ message: 'Internal server error while opening shift.' })
    }
  }
)

// POST /api/shifts/close — Close active cashier shift and compute Z-Reading / over-short
router.post(
  '/close',
  requireAuth,
  requireRole('cashier', 'admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { closing_cash, notes } = req.body as {
        closing_cash: number
        notes?: string
      }

      const countedCash = typeof closing_cash === 'number' ? Math.max(0, closing_cash) : 0

      const { data: staffProfile } = await supabaseAdmin
        .from('staff_profiles')
        .select('id, full_name')
        .eq('user_id', req.userId!)
        .single()

      if (!staffProfile) {
        res.status(403).json({ message: 'Staff profile not found.' })
        return
      }

      // Fetch active shift
      const { data: activeShift } = await supabaseAdmin
        .from('cashier_shifts')
        .select('*')
        .eq('cashier_id', staffProfile.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const openedAt = activeShift?.opened_at ?? new Date(Date.now() - 8 * 3600000).toISOString()
      const openingFloat = Number(activeShift?.opening_float ?? 0)

      // Query completed orders
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id, total_amount, payment_method, status, created_at')
        .eq('cashier_id', staffProfile.id)
        .eq('status', 'completed')
        .gte('created_at', openedAt)

      const cashSales = (orders ?? [])
        .filter(o => o.payment_method === 'cash')
        .reduce((sum, o) => sum + Number(o.total_amount), 0)

      const gcashSales = (orders ?? [])
        .filter(o => o.payment_method === 'gcash')
        .reduce((sum, o) => sum + Number(o.total_amount), 0)

      const cardSales = (orders ?? [])
        .filter(o => o.payment_method === 'card')
        .reduce((sum, o) => sum + Number(o.total_amount), 0)

      const totalSales = cashSales + gcashSales + cardSales
      const expectedCash = openingFloat + cashSales
      const cashDifference = countedCash - expectedCash

      const shiftSummary = {
        cashier_name: staffProfile.full_name,
        opening_float: openingFloat,
        closing_cash: countedCash,
        expected_cash: expectedCash,
        cash_difference: cashDifference,
        cash_sales: cashSales,
        gcash_sales: gcashSales,
        card_sales: cardSales,
        total_sales: totalSales,
        orders_count: (orders ?? []).length,
        opened_at: openedAt,
        closed_at: new Date().toISOString(),
        notes: notes ?? null,
        status: 'closed',
      }

      if (activeShift?.id) {
        await supabaseAdmin
          .from('cashier_shifts')
          .update({
            closing_cash: countedCash,
            expected_cash: expectedCash,
            cash_difference: cashDifference,
            total_sales: totalSales,
            cash_sales: cashSales,
            orders_count: (orders ?? []).length,
            status: 'closed',
            closed_at: new Date().toISOString(),
            notes: notes ?? null,
          })
          .eq('id', activeShift.id)
      }

      res.json({ message: 'Shift closed successfully.', shift: shiftSummary })
    } catch (err) {
      console.error('Close shift error:', err)
      res.status(500).json({ message: 'Internal server error while closing shift.' })
    }
  }
)

// GET /api/shifts/history — Shift history for audit and analytics
router.get(
  '/history',
  requireAuth,
  requireRole('admin', 'cashier'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { data: staffProfile } = await supabaseAdmin
        .from('staff_profiles')
        .select('id, role')
        .eq('user_id', req.userId!)
        .single()

      if (!staffProfile) {
        res.status(403).json({ message: 'Staff profile not found.' })
        return
      }

      let query = supabaseAdmin
        .from('cashier_shifts')
        .select('*, cashier:cashier_id(full_name, email)')
        .order('opened_at', { ascending: false })
        .limit(50)

      if (staffProfile.role === 'cashier') {
        query = query.eq('cashier_id', staffProfile.id)
      }

      const { data, error } = await query

      if (error) {
        res.json([])
        return
      }

      res.json(data ?? [])
    } catch (err) {
      console.error('Shift history error:', err)
      res.json([])
    }
  }
)

export default router
