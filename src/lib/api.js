import { supabase } from './supabase'

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('請重新登入')

  const res = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error + (data.details ? `: ${data.details}` : ''))
  return data
}
