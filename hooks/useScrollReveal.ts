"use client"

import * as React from "react"

export function useScrollReveal(containerRef: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const root = containerRef.current
    if (!root || typeof window === "undefined") return

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const fxElements = root.querySelectorAll<HTMLElement>("[data-fx], .sheet-panel")

    if (prefersReduced || !("IntersectionObserver" in window)) {
      fxElements.forEach((el) => el.classList.add("is-revealed"))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed")
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.1,
      }
    )

    fxElements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [containerRef])
}
