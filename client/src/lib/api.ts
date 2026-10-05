import { supabase } from './supabase'
import type { CheckoutPayload, InventoryAdjustmentPayload } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

/**
 * Get the current Supabase access token for Express API auth.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  let token = session?.access_token

  // If session is expired or expires within 60s, refresh it
  if (session?.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
    const { data: refreshData } = await supabase.auth.refreshSession()
    if (refreshData?.session?.access_token) {
      token = refreshData.session.access_token
    }
  }

  if (!token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${token}` }
}

/**
 * POST /api/checkout
 * Sends the order to Express, which handles inventory deduction.
 */
export async function apiCheckout(payload: CheckoutPayload) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Checkout failed' }))
    throw new Error(err.message ?? 'Checkout failed')
  }
  return res.json()
}

/**
 * PATCH /api/inventory/:id
 * Manual stock adjustment (restock / waste / correction).
 */
export async function apiAdjustInventory(payload: InventoryAdjustmentPayload) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/inventory/${payload.inventory_id}/adjust`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Adjustment failed' }))
    throw new Error(err.message ?? 'Adjustment failed')
  }
  return res.json()
}

/**
 * POST /api/staff/register (Public registration)
 */
export async function apiRegisterStaff(data: {
  email: string
  password: string
  full_name: string
  role: 'cashier' | 'inventory_personnel' | 'admin'
}) {
  const res = await fetch(`${API_BASE}/staff/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to create account' }))
    throw new Error(err.message ?? 'Failed to create account')
  }
  return res.json()
}

/**
 * POST /api/staff (Admin only)
 * Provisions a new staff account.
 */
export async function apiCreateStaff(data: {
  email: string
  password: string
  full_name: string
  role: 'cashier' | 'inventory_personnel' | 'admin'
}) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to create staff' }))
    throw new Error(err.message ?? 'Failed to create staff')
  }
  return res.json()
}

/**
 * DELETE /api/staff/:id  (Admin only — deactivates account)
 */
export async function apiDeactivateStaff(staffId: string) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/staff/${staffId}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to deactivate staff' }))
    throw new Error(err.message ?? 'Failed to deactivate staff')
  }
  return res.json()
}

/**
 * PATCH /api/staff/:id/reactivate (Admin only)
 */
export async function apiReactivateStaff(staffId: string) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/staff/${staffId}/reactivate`, {
    method: 'PATCH',
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to reactivate staff' }))
    throw new Error(err.message ?? 'Failed to reactivate staff')
  }
  return res.json()
}

/**
 * PATCH /api/staff/update-password (Authenticated users)
 */
export async function apiUpdatePassword(password: string) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/staff/update-password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to update password' }))
    throw new Error(err.message ?? 'Failed to update password')
  }
  return res.json()
}

/**
 * GET /api/orders (Cashier or Admin)
 */
export async function apiGetOrders() {
  try {
    const headers = await getAuthHeader()
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'GET',
      headers,
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Backend /api/orders unreachable, falling back to direct Supabase query:', err)
  }

  // Resilient fallback: direct Supabase query
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    let query = supabase
      .from('orders')
      .select('*, order_items(*), cashier:cashier_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (staffProfile && staffProfile.role === 'cashier') {
      query = query.eq('cashier_id', staffProfile.id)
    }

    const { data, error } = await query
    if (error) {
      const plainQuery = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (plainQuery.error) throw plainQuery.error
      return plainQuery.data ?? []
    }
    return data ?? []
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch orders')
  }
}

/**
 * POST /api/orders/:id/void (Cashier or Admin)
 */
export async function apiVoidOrder(orderId: string, reason?: string) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/orders/${orderId}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to void order' }))
    throw new Error(err.message ?? 'Failed to void order')
  }
  return res.json()
}

/**
 * GET /api/inventory/movements (Admin or Inventory Personnel)
 */
export async function apiGetInventoryMovements() {
  try {
    const headers = await getAuthHeader()
    const res = await fetch(`${API_BASE}/inventory/movements`, {
      method: 'GET',
      headers,
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Backend /api/inventory/movements unreachable, falling back to direct Supabase query:', err)
  }

  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*, inventory:inventory_id(name, unit)')
    .order('created_at', { ascending: false })
    .limit(150)

  if (error) {
    const fallback = await supabase
      .from('inventory_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150)
    if (fallback.error) throw new Error(fallback.error.message || 'Failed to fetch inventory movements')
    return fallback.data ?? []
  }
  return data ?? []
}

/**
 * POST /api/inventory (Admin or Inventory Personnel)
 */
export async function apiCreateInventoryItem(payload: {
  name: string
  category: string
  unit: string
  stock_qty?: number
  min_stock_level?: number
  unit_cost?: number
  supplier?: string
}) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to create inventory item' }))
    throw new Error(err.message ?? 'Failed to create inventory item')
  }
  return res.json()
}

/**
 * GET /api/products
 */
export async function apiGetProducts() {
  try {
    const headers = await getAuthHeader()
    const res = await fetch(`${API_BASE}/products`, {
      method: 'GET',
      headers,
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Backend /api/products unreachable, falling back to direct Supabase query:', err)
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:product_categories(id, name, sort_order), recipes:product_recipes(id, inventory_id, qty_per_unit, inventory:inventory(name, unit, stock_qty))')
      .order('name')

    if (error) {
      const basic = await supabase
        .from('products')
        .select('*, category:product_categories(id, name, sort_order)')
        .order('name')
      if (basic.error) throw basic.error
      return basic.data ?? []
    }
    return data ?? []
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch products')
  }
}

/**
 * GET /api/products/categories
 */
export async function apiGetCategories() {
  try {
    const headers = await getAuthHeader()
    const res = await fetch(`${API_BASE}/products/categories`, {
      method: 'GET',
      headers,
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Backend /api/products/categories unreachable, falling back to direct Supabase query:', err)
  }

  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('sort_order')

    if (error) throw error
    return data ?? []
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch categories')
  }
}

/**
 * POST /api/products/categories (Admin only)
 */
export async function apiCreateCategory(name: string) {
  try {
    const headers = await getAuthHeader()
    const res = await fetch(`${API_BASE}/products/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Backend /api/products/categories unreachable, falling back to direct Supabase insert:', err)
  }

  try {
    const { data: countData } = await supabase
      .from('product_categories')
      .select('sort_order', { count: 'exact' })

    const nextOrder = (countData?.length ?? 0) + 1
    const { data, error } = await supabase
      .from('product_categories')
      .insert({ name: name.trim(), sort_order: nextOrder })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : 'Failed to create category')
  }
}

/**
 * POST /api/products (Admin only)
 */
export async function apiCreateProduct(payload: {
  name: string
  category_id: string
  price: number
  is_available?: boolean
  image_url?: string
  recipes?: Array<{ inventory_id: string; qty_per_unit: number }>
}) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to create product' }))
    throw new Error(err.message ?? 'Failed to create product')
  }
  return res.json()
}

/**
 * PATCH /api/products/:id (Admin only)
 */
export async function apiUpdateProduct(id: string, payload: {
  name?: string
  category_id?: string
  price?: number
  is_available?: boolean
  image_url?: string
  recipes?: Array<{ inventory_id: string; qty_per_unit: number }>
}) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to update product' }))
    throw new Error(err.message ?? 'Failed to update product')
  }
  return res.json()
}

/**
 * PATCH /api/products/:id/toggle (Admin only)
 */
export async function apiToggleProductAvailability(id: string, is_available: boolean) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/products/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ is_available }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to toggle product availability' }))
    throw new Error(err.message ?? 'Failed to toggle product availability')
  }
  return res.json()
}

/**
 * DELETE /api/products/:id (Admin only)
 */
export async function apiDeleteProduct(id: string) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to delete product' }))
    throw new Error(err.message ?? 'Failed to delete product')
  }
  return res.json()
}

/**
 * GET /api/shifts/active
 */
export async function apiGetActiveShift() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/shifts/active`, {
    method: 'GET',
    headers,
  })
  if (!res.ok) return { shift: null }
  return res.json()
}

/**
 * POST /api/shifts/open
 */
export async function apiOpenShift(payload: { opening_float: number; notes?: string }) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/shifts/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to open shift' }))
    throw new Error(err.message ?? 'Failed to open shift')
  }
  return res.json()
}

/**
 * POST /api/shifts/close
 */
export async function apiCloseShift(payload: { closing_cash: number; notes?: string }) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/shifts/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to close shift' }))
    throw new Error(err.message ?? 'Failed to close shift')
  }
  return res.json()
}

/**
 * GET /api/shifts/history
 */
export async function apiGetShiftHistory() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_BASE}/shifts/history`, {
    method: 'GET',
    headers,
  })
  if (!res.ok) return []
  return res.json()
}



