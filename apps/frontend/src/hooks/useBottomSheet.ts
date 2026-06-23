import { useCallback, useRef, useState } from 'react'

const COLLAPSED_HEIGHT = 120
const EXPANDED_RATIO = 0.7
const SNAP_THRESHOLD = 40

export function useBottomSheet() {
  const [sheetHeight, setSheetHeight] = useState(COLLAPSED_HEIGHT)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const startH = useRef(0)

  const expandedHeight = Math.round(window.innerHeight * EXPANDED_RATIO)

  const snapToNearest = useCallback(
    (h: number) => {
      const mid = (COLLAPSED_HEIGHT + expandedHeight) / 2
      setSheetHeight(h > mid ? expandedHeight : COLLAPSED_HEIGHT)
    },
    [expandedHeight]
  )

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    startY.current = e.clientY
    startH.current = sheetHeight
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const delta = startY.current - e.clientY
    const next = Math.max(
      COLLAPSED_HEIGHT,
      Math.min(expandedHeight, startH.current + delta)
    )
    setSheetHeight(next)
  }

  const onPointerUp = () => {
    if (!dragging) return
    setDragging(false)
    const delta = sheetHeight - startH.current
    if (Math.abs(delta) < SNAP_THRESHOLD) {
      setSheetHeight(startH.current)
    } else {
      snapToNearest(sheetHeight)
    }
  }

  const toggle = () => {
    setSheetHeight(
      sheetHeight > COLLAPSED_HEIGHT ? COLLAPSED_HEIGHT : expandedHeight
    )
  }

  return {
    sheetHeight,
    dragging,
    expandedHeight,
    collapsedHeight: COLLAPSED_HEIGHT,
    toggle,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
