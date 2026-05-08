/**
 * SkeletonLoader — shimmer loading placeholder
 * Replaces "Chargement..." text with professional skeleton UI.
 * 
 * Usage: <SkeletonLoader type="dashboard" /> | "table" | "card" | "form"
 */
const shimmer = {
  background: 'linear-gradient(90deg, #E5E5E5 25%, #EFEFEF 50%, #E5E5E5 75%)',
  backgroundSize: '400% 100%',
  animation: 'shimmer 1.5s infinite ease-in-out',
}

function Bone({ w = '100%', h = 16, r = 6, mb = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb, ...shimmer }} />
}

export default function SkeletonLoader({ type = 'dashboard' }) {
  return (
    <div style={{ padding: 32 }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      
      {type === 'dashboard' && <>
        <Bone w={280} h={28} mb={8} />
        <Bone w={180} h={14} mb={32} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, padding: 24 }}><Bone w={60} h={32} mb={12} /><Bone w={100} h={14} /></div>)}
        </div>
        <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, padding: 24 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14 }}><Bone w={120} h={14} /><Bone w={200} h={14} /><Bone w={80} h={14} /><Bone w={60} h={14} /></div>)}
        </div>
      </>}
      
      {type === 'table' && <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, padding: 24 }}>
        <Bone w={200} h={20} mb={20} />
        {[1,2,3,4,5,6].map(i => <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14 }}><Bone w={140} h={14} /><Bone w={180} h={14} /><Bone w={100} h={14} /><Bone w={80} h={14} /></div>)}
      </div>}
      
      {type === 'card' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[1,2,3].map(i => <div key={i} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, padding: 24 }}><Bone w={60} h={12} mb={12} /><Bone w="80%" h={20} mb={8} /><Bone w="60%" h={14} /></div>)}
      </div>}
    </div>
  )
}
