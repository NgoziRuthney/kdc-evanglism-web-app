import { useState, useEffect, useRef } from 'react'

const TITLES = ['Evangelist', 'Steward', 'Minister', 'Pastor']
const TYPE_SPEED = 90
const ERASE_SPEED = 55
const PAUSE_AFTER_TYPE = 1400
const PAUSE_AFTER_ERASE = 300

export default function TypingTitle({ className = '' }) {
  const [display, setDisplay] = useState('')
  const [phase, setPhase] = useState('typing') // typing | pausing | erasing | waiting
  const [titleIdx, setTitleIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const current = TITLES[titleIdx]

    if (phase === 'typing') {
      if (charIdx < current.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplay(current.slice(0, charIdx + 1))
          setCharIdx(c => c + 1)
        }, TYPE_SPEED)
      } else {
        timeoutRef.current = setTimeout(() => setPhase('erasing'), PAUSE_AFTER_TYPE)
      }
    } else if (phase === 'erasing') {
      if (charIdx > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplay(current.slice(0, charIdx - 1))
          setCharIdx(c => c - 1)
        }, ERASE_SPEED)
      } else {
        timeoutRef.current = setTimeout(() => {
          setTitleIdx(i => (i + 1) % TITLES.length)
          setPhase('typing')
        }, PAUSE_AFTER_ERASE)
      }
    }

    return () => clearTimeout(timeoutRef.current)
  }, [phase, charIdx, titleIdx])

  return (
    <span className={className}>
      {display}
      <span className="typing-cursor" />
    </span>
  )
}
