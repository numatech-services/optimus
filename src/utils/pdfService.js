// PDF Generation Service — Optimus Campus v6
// Client-side HTML→print via iframe (no server required)

export function generateRecu(paiement, student) {
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Marianne','Roboto',sans-serif;color:#1a2035;padding:40px;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #1a2035}
  .logo{font-size:22px;font-weight:800}.logo span{color:#6366f1}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#1a2035;color:#fff;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase}
  td{padding:10px 14px;border-bottom:1px solid #f0f4f8;font-size:12px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
  .box{background:#f8f9fd;border-radius:8px;padding:14px;border-left:4px solid #6366f1}
  .lbl{font-size:10px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:4px}
  .val{font-weight:700;font-size:13px}
  .amount{font-size:32px;font-weight:800;color:#27ae60;text-align:center;margin:24px 0}
  .stamp{display:inline-block;border:3px solid #27ae60;color:#27ae60;padding:8px 24px;border-radius:4px;font-weight:800;font-size:16px;transform:rotate(-5deg)}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e8edf4;text-align:center;font-size:10px;color:#999}
</style></head><body>
<div class="header">
  <div><div class="logo">OPTIMUS<span>CAMPUS</span></div><div style="font-size:11px;color:#666;margin-top:4px">Université Abdou Moumouni · Niamey, Niger</div></div>
  <div style="text-align:right"><div style="font-size:20px;font-weight:800">REÇU DE PAIEMENT</div><div style="font-size:11px;color:#666;margin-top:4px">Réf : ${paiement.id}</div><div style="font-size:11px;color:#666">Date : ${paiement.date || new Date().toLocaleDateString('fr-FR')}</div></div>
</div>
<div class="info-grid">
  <div class="box"><div class="lbl">Étudiant</div><div class="val">${student?.prenom||''} ${student?.nom||paiement.studentName||''}</div><div style="font-size:11px;color:#666;margin-top:4px">${paiement.studentId} · ${student?.filiere||paiement.filiere||''}</div></div>
  <div class="box"><div class="lbl">Méthode</div><div class="val">${paiement.methode||'—'}</div><div style="font-size:11px;color:#666;margin-top:4px">Année 2025-2026</div></div>
</div>
<table><thead><tr><th>Description</th><th>Montant XOF</th><th>Statut</th></tr></thead>
<tbody><tr><td>${paiement.desc||'Frais de scolarité'}</td><td style="font-weight:700">${(paiement.montant||0).toLocaleString('fr')} XOF</td><td><span style="background:#d4edda;color:#155724;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">PAYÉ</span></td></tr></tbody></table>
<div class="amount">${(paiement.montant||0).toLocaleString('fr')} XOF</div>
<div style="text-align:center"><div class="stamp">✓ PAYÉ</div></div>
<div class="footer"><p>Reçu généré automatiquement · Optimus Campus</p><p style="margin-top:4px">Service Scolarité · scolarite@univ-abdoumoumouni.ne · +227 20 31 56 78</p></div>
</body></html>`
  return html
}

export function generateBulletin(student, notes) {
  const s1 = notes.filter(n => n.semestre === 'S1')
  const s2 = notes.filter(n => n.semestre === 'S2')
  const moy = (arr) => {
    const t = arr.reduce((s,n) => s + n.noteFinal * n.coef, 0)
    const c = arr.reduce((s,n) => s + n.coef, 0)
    return c > 0 ? (t/c).toFixed(2) : '—'
  }
  const renderSem = (arr, sem) => arr.length === 0 ? '' : `
    <h3 style="font-size:13px;font-weight:800;margin:20px 0 10px;color:#1a2035;border-left:4px solid #6366f1;padding-left:10px">Semestre ${sem}</h3>
    <table><thead><tr><th>Code</th><th>Matière</th><th>Coef</th><th>CC</th><th>Examen</th><th>Moyenne</th><th>Mention</th></tr></thead>
    <tbody>
    ${arr.map(n=>`<tr style="${n.noteFinal<10?'background:#fef0ee':''}">
      <td style="font-family:monospace;font-size:11px">${n.code}</td><td>${n.matiere}</td>
      <td style="text-align:center;font-weight:700">${n.coef}</td>
      <td style="text-align:center">${n.noteCC}</td><td style="text-align:center">${n.noteExamen}</td>
      <td style="text-align:center;font-weight:800;color:${n.noteFinal>=10?'#155724':'#c0392b'}">${n.noteFinal}</td>
      <td style="font-size:11px;font-weight:700;color:${n.noteFinal>=10?'#155724':'#c0392b'}">${n.mention}</td>
    </tr>`).join('')}
    <tr style="background:#f8f9fd;font-weight:800"><td colspan="5" style="text-align:right">Moyenne générale</td>
    <td style="text-align:center;font-size:16px;color:${Number(moy(arr))>=10?'#27ae60':'#c0392b'}">${moy(arr)}</td><td></td></tr>
    </tbody></table>`

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Marianne','Roboto',sans-serif;color:#1a2035;padding:40px;font-size:12px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #1a2035}
  .logo{font-size:20px;font-weight:800}.logo span{color:#6366f1}
  .stu{background:#f8f9fd;border-radius:8px;padding:14px;margin-bottom:16px;border-left:4px solid #6366f1;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .lbl{font-size:9px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:3px}.val{font-weight:700;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  th{background:#1a2035;color:#fff;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase}
  td{padding:8px 12px;border-bottom:1px solid #f0f4f8}
  .footer{margin-top:32px;padding-top:14px;border-top:1px solid #e8edf4;text-align:center;font-size:10px;color:#999}
</style></head><body>
<div class="header">
  <div><div class="logo">OPTIMUS<span>CAMPUS</span></div><div style="font-size:10px;color:#666;margin-top:2px">Université Abdou Moumouni · Niamey, Niger</div></div>
  <div style="text-align:right"><div style="font-size:18px;font-weight:800">BULLETIN DE NOTES</div><div style="font-size:11px;color:#666;margin-top:3px">Année 2025-2026 · Généré le ${new Date().toLocaleDateString('fr-FR')}</div></div>
</div>
<div class="stu">
  <div><div class="lbl">Matricule</div><div class="val">${student.id}</div></div>
  <div><div class="lbl">Nom complet</div><div class="val">${student.prenom} ${student.nom}</div></div>
  <div><div class="lbl">Filière</div><div class="val">${student.filiere}</div></div>
  <div><div class="lbl">Statut</div><div class="val">${student.status||'ACTIF'}</div></div>
</div>
${renderSem(s1,'1')}${renderSem(s2,'2')}
<div style="margin-top:40px;text-align:right"><div style="font-size:11px;color:#666;margin-bottom:40px">Le Chef du Département</div><div style="width:160px;border-top:1px solid #1a2035;padding-top:6px;font-size:10px;color:#666;display:inline-block">Signature et cachet</div></div>
<div class="footer">Document officiel · Optimus Campus · ${student.id} · ${new Date().toLocaleDateString('fr-FR')}</div>
</body></html>`
}

export function generateConvocation(student, convocations) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Marianne','Roboto',sans-serif;color:#1a2035;padding:40px;font-size:12px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #1a2035}
  .logo{font-size:20px;font-weight:800}.logo span{color:#6366f1}
  .alert{background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:11px}
  .stu{background:#f8f9fd;border-radius:8px;padding:14px;margin-bottom:16px;border-left:4px solid #6366f1;display:flex;gap:32px}
  .lbl{font-size:9px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:3px}.val{font-weight:800;font-size:14px}
  table{width:100%;border-collapse:collapse}
  th{background:#1a2035;color:#fff;padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase}
  td{padding:10px 14px;border-bottom:1px solid #f0f4f8}
  .footer{margin-top:28px;padding-top:14px;border-top:1px solid #e8edf4;text-align:center;font-size:10px;color:#999}
</style></head><body>
<div class="header">
  <div><div class="logo">OPTIMUS<span>CAMPUS</span></div><div style="font-size:10px;color:#666;margin-top:2px">Université Abdou Moumouni · Niamey, Niger</div></div>
  <div style="text-align:right"><div style="font-size:18px;font-weight:800">CONVOCATION AUX EXAMENS</div><div style="font-size:11px;color:#666;margin-top:3px">Session S2 — Mars 2026</div></div>
</div>
<div class="alert">⚠️ <strong>Présentez-vous 15 min avant</strong> · Carte d'étudiant obligatoire · Badge RFID requis · Téléphone éteint</div>
<div class="stu">
  <div><div class="lbl">Matricule</div><div class="val">${student.id}</div></div>
  <div><div class="lbl">Étudiant</div><div class="val">${student.prenom} ${student.nom}</div></div>
  <div><div class="lbl">Filière</div><div class="val">${student.filiere}</div></div>
</div>
<table><thead><tr><th>Matière</th><th>Code</th><th>Date</th><th>Horaire</th><th>Salle</th><th style="text-align:center">Table N°</th></tr></thead>
<tbody>
${convocations.map(c=>`<tr><td style="font-weight:700">${c.matiere}</td><td style="font-family:monospace;font-size:11px">${c.code}</td><td style="font-weight:800;color:#6366f1">${c.date}</td><td>${c.heure}</td><td style="font-weight:700">${c.salle}</td><td style="font-weight:800;font-size:16px;color:#e85d04;text-align:center">${c.table||'—'}</td></tr>`).join('')}
</tbody></table>
<div class="footer">Convocation officielle · Optimus Campus · Service Scolarité · ${new Date().toLocaleDateString('fr-FR')}</div>
</body></html>`
}

export function generateAttestation(student, tenant) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const year = new Date().getFullYear()
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Marianne','Roboto',sans-serif;color:#1a2035;padding:50px 60px;font-size:13px;line-height:1.7}
  .header{text-align:center;margin-bottom:40px;padding-bottom:24px;border-bottom:3px solid #111827}
  .logo{font-family:'Marianne','Roboto',sans-serif;font-size:24px;font-weight:800;letter-spacing:-.02em}
  .logo span{color:#6366f1}
  .republic{font-size:11px;color:#666;margin-bottom:8px;text-transform:uppercase;letter-spacing:.1em}
  .uni-name{font-size:16px;font-weight:700;margin-top:6px}
  .title{text-align:center;margin:40px 0;font-family:'Marianne','Roboto',sans-serif;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#6366f1;border:2px solid #6366f1;display:inline-block;padding:12px 40px;border-radius:4px}
  .title-wrap{text-align:center;margin:40px 0}
  .body-text{font-size:14px;margin-bottom:16px}
  .student-info{background:#f8f9fd;border-radius:10px;padding:20px 24px;margin:24px 0;border-left:4px solid #6366f1}
  .info-row{display:flex;margin-bottom:8px}
  .info-label{width:180px;font-weight:700;color:#666;font-size:12px}
  .info-value{font-weight:700;font-size:13px}
  .signature{display:flex;justify-content:flex-end;margin-top:60px}
  .sig-block{text-align:center;width:240px}
  .sig-title{font-size:11px;color:#666;margin-bottom:60px}
  .sig-name{font-weight:700;font-size:13px;border-top:1px solid #ccc;padding-top:8px}
  .footer{margin-top:60px;padding-top:16px;border-top:1px solid #e8edf4;text-align:center;font-size:10px;color:#999}
  .stamp{display:inline-block;border:3px solid #6366f1;color:#6366f1;padding:8px 20px;border-radius:4px;font-family:'Marianne','Roboto',sans-serif;font-weight:800;font-size:14px;transform:rotate(-5deg);margin-top:20px}
  @media print{body{padding:30px 40px}}
</style></head><body>
<div class="header">
  <div class="republic">République du Niger — Ministère de l'Enseignement Supérieur</div>
  <div class="logo">OPTIMUS<span>CAMPUS</span></div>
  <div class="uni-name">${tenant?.name || 'Université de Niamey'}</div>
  <div style="font-size:11px;color:#888;margin-top:4px">Service de la Scolarité</div>
</div>

<div class="title-wrap">
  <div class="title">Attestation de Scolarité</div>
</div>

<div class="body-text">
  Le Directeur de la Scolarité de <strong>${tenant?.name || 'l\'Université de Niamey'}</strong> certifie que :
</div>

<div class="student-info">
  <div class="info-row"><span class="info-label">Nom et Prénom :</span><span class="info-value">${student?.prenom || ''} ${student?.nom || ''}</span></div>
  <div class="info-row"><span class="info-label">Matricule :</span><span class="info-value">${student?.id || '—'}</span></div>
  <div class="info-row"><span class="info-label">Filière :</span><span class="info-value">${student?.filiere || '—'}</span></div>
  <div class="info-row"><span class="info-label">Année académique :</span><span class="info-value">${student?.annee || (year - 1) + '-' + year}</span></div>
  <div class="info-row"><span class="info-label">Statut :</span><span class="info-value">${student?.status || 'ACTIF'}</span></div>
</div>

<div class="body-text">
  est régulièrement inscrit(e) au sein de notre établissement pour l'année académique ${student?.annee || (year - 1) + '-' + year}.
</div>

<div class="body-text">
  La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
</div>

<div style="text-align:center"><div class="stamp">CERTIFIÉ CONFORME</div></div>

<div class="signature">
  <div class="sig-block">
    <div style="font-size:12px;margin-bottom:4px">Fait à Niamey, le ${today}</div>
    <div class="sig-title">Le Directeur de la Scolarité</div>
    <div class="sig-name">___________________</div>
  </div>
</div>

<div class="footer">
  Document officiel — ${tenant?.name || 'Université de Niamey'} — Généré le ${today} — Réf. ATT-${student?.id || '0000'}-${year}<br>
  Optimus Campus · ERP Universitaire
</div>
</body></html>`
  return html
}

export function generateRelevePaiement(student, paiements, tenant) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const totalPaye = paiements.filter(p => p.statut === 'PAYÉ').reduce((s, p) => s + (p.montant || 0), 0)
  const totalDu = paiements.reduce((s, p) => s + (p.montant || 0), 0)
  const solde = totalDu - totalPaye
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Marianne','Roboto',sans-serif;color:#1a2035;padding:40px;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #111827}
  .logo{font-family:'Marianne','Roboto',sans-serif;font-size:22px;font-weight:800}.logo span{color:#6366f1}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#111827;color:#fff;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:700}
  td{padding:10px 14px;border-bottom:1px solid #f0f4f8;font-size:12px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .box{background:#f8f9fd;border-radius:8px;padding:14px;border-left:4px solid #6366f1}
  .lbl{font-size:10px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:4px}
  .val{font-weight:700;font-size:13px}
  .summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:24px 0}
  .sum-box{text-align:center;padding:16px;border-radius:10px}
  .sum-val{font-family:'Marianne','Roboto',sans-serif;font-weight:800;font-size:20px}
  .sum-lbl{font-size:10px;color:#666;text-transform:uppercase;margin-top:4px}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e8edf4;text-align:center;font-size:10px;color:#999}
  .paid{color:#27ae60}.due{color:#e74c3c}
  @media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div><div class="logo">OPTIMUS<span>CAMPUS</span></div><div style="font-size:11px;color:#666;margin-top:4px">${tenant?.name || 'Université de Niamey'} · Niamey, Niger</div></div>
  <div style="text-align:right"><div style="font-size:18px;font-weight:800">RELEVÉ DE PAIEMENT</div><div style="font-size:11px;color:#666;margin-top:4px">Date : ${today}</div></div>
</div>
<div class="info-grid">
  <div class="box"><div class="lbl">Étudiant</div><div class="val">${student?.prenom || ''} ${student?.nom || ''}</div><div style="font-size:11px;color:#666;margin-top:4px">${student?.id || '—'} · ${student?.filiere || ''}</div></div>
  <div class="box"><div class="lbl">Année académique</div><div class="val">${student?.annee || new Date().getFullYear()}</div><div style="font-size:11px;color:#666;margin-top:4px">${paiements.length} transaction(s)</div></div>
</div>
<div class="summary">
  <div class="sum-box" style="background:#f0fdf4"><div class="sum-val paid">${totalPaye.toLocaleString('fr')} F</div><div class="sum-lbl">Total payé</div></div>
  <div class="sum-box" style="background:#fef2f2"><div class="sum-val due">${solde.toLocaleString('fr')} F</div><div class="sum-lbl">Solde restant</div></div>
  <div class="sum-box" style="background:#eef2ff"><div class="sum-val">${totalDu.toLocaleString('fr')} F</div><div class="sum-lbl">Total dû</div></div>
</div>
<table>
<thead><tr><th>Date</th><th>Description</th><th>Méthode</th><th>Montant</th><th>Statut</th></tr></thead>
<tbody>
${paiements.map(p => `<tr>
  <td>${p.date || '—'}</td>
  <td>${p.description || p.desc || '—'}</td>
  <td>${p.methode || '—'}</td>
  <td style="font-weight:700">${(p.montant || 0).toLocaleString('fr')} F</td>
  <td><span style="color:${p.statut === 'PAYÉ' ? '#27ae60' : '#e74c3c'};font-weight:700">${p.statut}</span></td>
</tr>`).join('')}
</tbody></table>
<div class="footer">Relevé de paiement officiel · ${tenant?.name || 'Université de Niamey'} · ${today} · Optimus Campus</div>
</body></html>`
  return html
}

export function printDocument(html) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;border:none'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()
  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => { if(document.body.contains(iframe)) document.body.removeChild(iframe) }, 3000)
  }, 600)
}
