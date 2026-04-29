import { useCallback, useEffect, useRef, useState } from 'react'

type CarouselDirection = 'previous' | 'next'

type UseCarouselTrackOptions = {
  itemCount: number
  itemSelector: string
}

const SCROLL_EDGE_TOLERANCE = 2

export function useCarouselTrack({ itemCount, itemSelector }: UseCarouselTrackOptions) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [canNavigate, setCanNavigate] = useState(false)
  const [canScrollPrevious, setCanScrollPrevious] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const updateNavigationState = useCallback(() => {
    const track = trackRef.current
    if (!track) {
      setCanNavigate(false)
      setCanScrollPrevious(false)
      setCanScrollNext(false)
      return
    }

    const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth)
    const isScrollable = itemCount > 1 && maxScrollLeft > SCROLL_EDGE_TOLERANCE

    setCanNavigate(isScrollable)
    setCanScrollPrevious(isScrollable && track.scrollLeft > SCROLL_EDGE_TOLERANCE)
    setCanScrollNext(isScrollable && track.scrollLeft < maxScrollLeft - SCROLL_EDGE_TOLERANCE)
  }, [itemCount])

  const scrollTrack = useCallback((direction: CarouselDirection) => {
    const track = trackRef.current
    if (!track) return

    const firstCard = track.querySelector<HTMLElement>(itemSelector)
    const trackStyles = window.getComputedStyle(track)
    const gap = Number.parseFloat(trackStyles.columnGap || trackStyles.gap || '0')
    const distance = firstCard ? firstCard.offsetWidth + gap : track.clientWidth * 0.8

    track.scrollBy({ left: direction === 'next' ? distance : -distance, behavior: 'smooth' })
    window.requestAnimationFrame(updateNavigationState)
  }, [itemSelector, updateNavigationState])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    updateNavigationState()

    const handleScroll = () => updateNavigationState()
    track.addEventListener('scroll', handleScroll, { passive: true })

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateNavigationState)
      resizeObserver.observe(track)
    } else {
      window.addEventListener('resize', updateNavigationState)
    }

    return () => {
      track.removeEventListener('scroll', handleScroll)
      resizeObserver?.disconnect()
      if (typeof ResizeObserver === 'undefined') {
        window.removeEventListener('resize', updateNavigationState)
      }
    }
  }, [updateNavigationState])

  useEffect(() => {
    window.requestAnimationFrame(updateNavigationState)
  }, [itemCount, updateNavigationState])

  return {
    canNavigate,
    canScrollNext,
    canScrollPrevious,
    scrollTrack,
    trackRef
  }
}
