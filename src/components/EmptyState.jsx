import { Leaf } from 'lucide-react'

export function EmptyState({ message, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      <Leaf size={20} aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}
