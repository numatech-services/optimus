import { supabase } from '../lib/supabase'

export function getTenantId(user) {
  return user?.tenant_id || user?.tenant || null
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

async function maybeSingle(query) {
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data || null
}

export async function enrichAuthProfile(profile) {
  if (!profile?.email) return profile

  const tenantId = getTenantId(profile)
  let enriched = { ...profile }

  if (profile.role === 'etudiant') {
    try {
      let student = null

      if (tenantId) {
        student = await maybeSingle(
          supabase
            .from('students')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('email', profile.email)
        )
      }

      if (!student) {
        student = await maybeSingle(
          supabase
            .from('students')
            .select('*')
            .eq('email', profile.email)
        )
      }

      if (student) {
        enriched = {
          ...enriched,
          student_id: student.id,
          matricule: student.matricule || student.id,
          filiere: student.filiere || enriched.filiere || '',
        }
      }
    } catch {
      // Best-effort enrichment only.
    }
  }

  if (profile.role === 'enseignant') {
    try {
      let teacher = null

      if (tenantId) {
        teacher = await maybeSingle(
          supabase
            .from('teachers')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('email', profile.email)
        )
      }

      if (!teacher) {
        teacher = await maybeSingle(
          supabase
            .from('teachers')
            .select('*')
            .eq('email', profile.email)
        )
      }

      if (teacher) {
        enriched = {
          ...enriched,
          teacher_id: teacher.id,
          teacher_name: `${teacher.prenom || ''} ${teacher.nom || ''}`.trim() || enriched.name,
        }
      }
    } catch {
      // Best-effort enrichment only.
    }
  }

  return enriched
}

export async function resolveStudentContext(user) {
  const tenantId = getTenantId(user)
  const ids = unique([user?.student_id, user?.matricule])
  let student = null

  if (user?.email) {
    const emailQuery = supabase
      .from('students')
      .select('*')
      .eq('email', user.email)

    student = await maybeSingle(
      tenantId ? emailQuery.eq('tenant_id', tenantId) : emailQuery
    ).catch(() => null)
  }

  if (!student) {
    for (const id of ids) {
      const idQuery = supabase
        .from('students')
        .select('*')
        .eq('id', id)

      student = await maybeSingle(
        tenantId ? idQuery.eq('tenant_id', tenantId) : idQuery
      ).catch(() => null)

      if (student) break

      const matriculeQuery = supabase
        .from('students')
        .select('*')
        .eq('matricule', id)

      student = await maybeSingle(
        tenantId ? matriculeQuery.eq('tenant_id', tenantId) : matriculeQuery
      ).catch(() => null)

      if (student) break
    }
  }

  return {
    student,
    tenantId,
    studentId: student?.id || user?.student_id || user?.matricule || null,
    matricule: student?.matricule || user?.matricule || student?.id || null,
    filiere: student?.filiere || user?.filiere || '',
  }
}

export async function resolveTeacherContext(user) {
  const tenantId = getTenantId(user)
  let teacher = null

  if (user?.email) {
    const teacherQuery = supabase
      .from('teachers')
      .select('*')
      .eq('email', user.email)

    teacher = await maybeSingle(
      tenantId ? teacherQuery.eq('tenant_id', tenantId) : teacherQuery
    ).catch(() => null)
  }

  const teacherNames = unique([
    user?.teacher_name,
    user?.name,
    teacher ? `${teacher.prenom || ''} ${teacher.nom || ''}`.trim() : null,
    teacher?.nom ? `Prof. ${teacher.nom}` : null,
    teacher?.nom,
  ])

  return { teacher, tenantId, teacherNames }
}

export function normalizeCourse(course) {
  return {
    ...course,
    code: course.code || course.id,
    titre: course.titre || course.matiere || course.code || 'Cours',
    prof: course.prof_name || course.prof || course.enseignant || '',
    filiere: course.filiere || '',
    heures: Number(course.heures_total ?? course.heures ?? course.heures_prevues ?? 0),
    effectuees: Number(course.heures_effectuees ?? course.effectuees ?? course.heures_effectuees ?? 0),
    etudiants: Number(course.etudiants_count ?? course.etudiants ?? 0),
    coef: Number(course.coef ?? course.coefficient ?? 1),
  }
}

export function filterTeacherCourses(courses, teacherNames) {
  const normalizedNames = unique(teacherNames.map(normalize))

  return courses.filter((course) => {
    if (!normalizedNames.length) return true

    const teacherValues = unique([
      course.prof_name,
      course.prof,
      course.enseignant,
    ].map(normalize))

    if (!teacherValues.length) return true

    return teacherValues.some((teacherValue) =>
      normalizedNames.some((name) =>
        teacherValue === name || teacherValue.includes(name) || name.includes(teacherValue)
      )
    )
  })
}
