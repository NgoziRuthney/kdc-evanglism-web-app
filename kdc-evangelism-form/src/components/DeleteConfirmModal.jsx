export default function DeleteConfirmModal({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-center font-bold text-gray-900 text-lg">{title}</h2>
          <p className="text-center text-sm text-gray-500 mt-2 leading-relaxed">{message}</p>
          <p className="text-center text-xs text-red-600 font-medium mt-3 bg-red-50 rounded-lg py-2 px-3">
            ⚠ This action is irreversible and cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel} disabled={loading} className="btn-secondary flex-1">
            No, Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting…
              </span>
            ) : 'Yes, Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
