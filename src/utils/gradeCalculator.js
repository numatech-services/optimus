/**
 * Grade Calculator — Optimus Campus
 * Calculates final grades based on the tenant's notation configuration.
 * 
 * Usage:
 *   const config = tenant_config.systeme_notation // from Supabase
 *   const result = calculateGrade(noteCC, noteExamen, config)
 *   // → { noteFinal: 14.2, mention: 'Bien', valide: true, rattrapage: false }
 */

const DEFAULT_CONFIG = {
  note_max: 20,
  note_validation: 10,
  note_rattrapage: 8,
  coefficient_cc: 0.4,
  coefficient_examen: 0.6,
  mentions: [
    { seuil: 16, label: 'Très Bien' },
    { seuil: 14, label: 'Bien' },
    { seuil: 12, label: 'Assez Bien' },
    { seuil: 10, label: 'Passable' },
  ],
  compensation_ue: true,
  seuil_compensation: 8,
}

/**
 * Calculate the final grade for a single subject.
 */
export function calculateGrade(noteCC, noteExamen, config = DEFAULT_CONFIG) {
  const cc = Number(noteCC) || 0
  const exam = Number(noteExamen) || 0
  const coefCC = config.coefficient_cc || 0.4
  const coefExam = config.coefficient_examen || 0.6

  const noteFinal = Math.round((cc * coefCC + exam * coefExam) * 100) / 100

  // Determine mention
  const mentions = (config.mentions || DEFAULT_CONFIG.mentions)
    .sort((a, b) => b.seuil - a.seuil)
  
  let mention = 'Ajourné'
  for (const m of mentions) {
    if (noteFinal >= m.seuil) {
      mention = m.label
      break
    }
  }

  const valide = noteFinal >= (config.note_validation || 10)
  const rattrapage = !valide && noteFinal >= (config.note_rattrapage || 8)

  return {
    noteFinal,
    mention: valide ? mention : (rattrapage ? 'Rattrapage' : 'Ajourné'),
    valide,
    rattrapage,
  }
}

/**
 * Calculate the weighted average for a semester (multiple subjects).
 * @param {Array} notes - [{ noteCC, noteExamen, coef }]
 */
export function calculateSemesterAverage(notes, config = DEFAULT_CONFIG) {
  if (!notes || notes.length === 0) return { moyenne: 0, mention: 'N/A', valide: false, credits: 0, totalCredits: 0 }

  let totalWeighted = 0
  let totalCoef = 0
  let creditsValides = 0
  let totalCredits = 0

  for (const note of notes) {
    const coef = Number(note.coef) || 1
    const { noteFinal, valide } = calculateGrade(note.noteCC || note.note_cc, note.noteExamen || note.note_examen, config)
    
    totalWeighted += noteFinal * coef
    totalCoef += coef
    totalCredits += coef * 2 // Approximate: 1 coef = 2 ECTS

    if (valide) {
      creditsValides += coef * 2
    } else if (config.compensation_ue && noteFinal >= (config.seuil_compensation || 8)) {
      // Compensation possible — will be validated if semester average >= seuil
      creditsValides += coef * 2 // Tentatively count, will be adjusted
    }
  }

  const moyenne = totalCoef > 0 ? Math.round((totalWeighted / totalCoef) * 100) / 100 : 0

  // Determine semester mention
  const mentions = (config.mentions || DEFAULT_CONFIG.mentions).sort((a, b) => b.seuil - a.seuil)
  let mention = 'Ajourné'
  for (const m of mentions) {
    if (moyenne >= m.seuil) { mention = m.label; break }
  }

  const valide = moyenne >= (config.note_validation || 10)

  // If not valid, remove compensated credits
  if (!valide) {
    creditsValides = notes.reduce((sum, note) => {
      const { noteFinal } = calculateGrade(note.noteCC || note.note_cc, note.noteExamen || note.note_examen, config)
      return sum + (noteFinal >= (config.note_validation || 10) ? (Number(note.coef) || 1) * 2 : 0)
    }, 0)
  }

  return {
    moyenne,
    mention: valide ? mention : 'Ajourné',
    valide,
    credits: creditsValides,
    totalCredits,
  }
}

/**
 * Calculate cumulative GPA across semesters.
 * @param {Array} semesters - [{ notes: [...], label: 'S1' }]
 */
export function calculateCumulativeGPA(semesters, config = DEFAULT_CONFIG) {
  let totalCredits = 0
  let validatedCredits = 0
  let totalWeighted = 0
  let totalCoef = 0

  for (const sem of semesters) {
    const result = calculateSemesterAverage(sem.notes, config)
    totalCredits += result.totalCredits
    validatedCredits += result.credits
    
    const semCoef = sem.notes.reduce((s, n) => s + (Number(n.coef) || 1), 0)
    totalWeighted += result.moyenne * semCoef
    totalCoef += semCoef
  }

  const moyenneGenerale = totalCoef > 0 ? Math.round((totalWeighted / totalCoef) * 100) / 100 : 0

  return {
    moyenneGenerale,
    totalCredits,
    validatedCredits,
    progression: totalCredits > 0 ? Math.round((validatedCredits / totalCredits) * 100) : 0,
  }
}
