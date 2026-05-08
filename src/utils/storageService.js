import { supabase } from '../lib/supabase'

const BUCKET = 'student-photos'
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

/**
 * Upload a student photo to Supabase Storage.
 * @param {File} file - The image file
 * @param {string} studentId - ETU-XXXX-XXXX
 * @returns {{ url: string, error: string|null }}
 */
export async function uploadStudentPhoto(file, studentId) {
  if (!file) return { url: null, error: 'Aucun fichier sélectionné' }
  if (file.size > MAX_SIZE) return { url: null, error: 'Fichier trop volumineux (max 2 Mo)' }
  if (!file.type.startsWith('image/')) return { url: null, error: 'Le fichier doit être une image' }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${studentId}.${ext}`

  try {
    // Delete existing photo if any
    await supabase.storage.from(BUCKET).remove([path])

    // Upload new photo
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path)

    return { url: publicUrl, error: null }
  } catch (err) {
    console.error('[Storage] Upload error:', err.message)
    return { url: null, error: err.message }
  }
}

/**
 * Delete a student photo from Supabase Storage.
 */
export async function deleteStudentPhoto(studentId) {
  try {
    const extensions = ['jpg', 'jpeg', 'png', 'webp']
    const paths = extensions.map(ext => `${studentId}.${ext}`)
    await supabase.storage.from(BUCKET).remove(paths)
  } catch {
    // Silencieux
  }
}

/**
 * Get the photo URL for a student (or null).
 */
export function getStudentPhotoUrl(studentId, ext = 'jpg') {
  if (!studentId) return null
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`${studentId}.${ext}`)
  return publicUrl
}


/**
 * Upload a teacher photo to Supabase Storage
 */
export async function uploadTeacherPhoto(file, teacherId) {
  const ext = file.name.split('.').pop()
  const path = `teachers/${teacherId}.${ext}`
  
  try {
    await supabase.storage.from('student-photos').remove([path])
    const { error } = await supabase.storage.from('student-photos').upload(path, file, {
      cacheControl: '3600', upsert: true, contentType: file.type,
    })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('student-photos').getPublicUrl(path)
    return publicUrl
  } catch (err) {
    console.error('[Storage] Teacher photo error:', err.message)
    return null
  }
}

/**
 * Upload a user/agent photo to Supabase Storage
 */
export async function uploadUserPhoto(file, userId) {
  const ext = file.name.split('.').pop()
  const path = `users/${userId}.${ext}`
  
  try {
    await supabase.storage.from('student-photos').remove([path])
    const { error } = await supabase.storage.from('student-photos').upload(path, file, {
      cacheControl: '3600', upsert: true, contentType: file.type,
    })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('student-photos').getPublicUrl(path)
    return publicUrl
  } catch (err) {
    console.error('[Storage] User photo error:', err.message)
    return null
  }
}
