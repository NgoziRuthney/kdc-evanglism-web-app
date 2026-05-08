import { useEffect, useRef } from 'react'

export default function ContextMenu({ x, y, onEdit, onDelete, onClose }) {
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Adjust position so menu doesn't go off screen
  const menuWidth = 160
  const menuHeight = 100
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8)
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8)

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: adjustedY, left: adjustedX, zIndex: 9999 }}
      className="bg-white rounded-xl shadow-2xl border border-gray-100 py-1 min-w-[160px] overflow-hidden"
    >
      <button
        onClick={() => { onEdit(); onClose() }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 
          hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
      >
        <span>✏️</span> Edit Record
      </button>
      <div className="border-t border-gray-100 mx-2" />
      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 
          hover:bg-red-50 transition-colors text-left"
      >
        <span>🗑️</span> Delete Record
      </button>
    </div>
  )
}
