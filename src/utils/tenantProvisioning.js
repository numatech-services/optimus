import { supabase } from '../lib/supabase'

const DEFAULT_PLAN = 'STANDARD'
const DEFAULT_STATUS = 'SETUP'

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function buildTenantPayload({
  name,
  country,
  plan = DEFAULT_PLAN,
  status = DEFAULT_STATUS,
  students = 0,
  teachers = 0,
  campus = 1,
  mrr = 0,
}) {
  return {
    name: String(name || '').trim(),
    country: String(country || '').trim() || 'Niger',
    plan: plan || DEFAULT_PLAN,
    status: status || DEFAULT_STATUS,
    students_count: toNumber(students),
    teachers_count: toNumber(teachers),
    campus_count: Math.max(1, toNumber(campus, 1)),
    mrr: Math.max(0, toNumber(mrr)),
  }
}

export async function ensureTenantConfig(tenantId, overrides = {}) {
  const payload = {
    tenant_id: tenantId,
    ...overrides,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('tenant_config')
    .upsert(payload)

  return { error }
}

export async function createTenantWithDefaults({ tenantId, tenantPayload, configOverrides }) {
  const { error: tenantError } = await supabase
    .from('tenants')
    .insert([{ id: tenantId, ...tenantPayload }])

  if (tenantError) {
    return { error: tenantError, configWarning: null }
  }

  const { error: configError } = await ensureTenantConfig(tenantId, configOverrides)
  return { error: null, configWarning: configError || null }
}

export async function updateTenantWithDefaults({ tenantId, tenantPayload, configOverrides }) {
  const { error: tenantError } = await supabase
    .from('tenants')
    .update(tenantPayload)
    .eq('id', tenantId)

  if (tenantError) {
    return { error: tenantError, configWarning: null }
  }

  const { error: configError } = await ensureTenantConfig(tenantId, configOverrides)
  return { error: null, configWarning: configError || null }
}

export async function provisionSchoolWithAdmin({
  schoolName,
  country,
  plan = DEFAULT_PLAN,
  status = DEFAULT_STATUS,
  students = 0,
  teachers = 0,
  campus = 1,
  mrr = 0,
  adminName,
  adminEmail,
  adminPassword,
}) {
  return supabase.functions.invoke('provision-school', {
    body: {
      schoolName,
      country,
      plan,
      status,
      students,
      teachers,
      campus,
      mrr,
      adminName,
      adminEmail,
      adminPassword,
    },
  })
}

export async function provisionPlatformUser({
  name,
  email,
  password,
  role,
  tenantId,
}) {
  return supabase.functions.invoke('provision-user', {
    body: {
      name,
      email,
      password,
      role,
      tenantId,
    },
  })
}
