import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Scroll Fade: rolagem horizontal que esmaece só a borda que transborda
 * (cópia à mão do Scroll Fade do shadcn.io, sem pacote). `data-fade` diz quais
 * bordas têm conteúdo escondido: "start", "end", "both" ou ausente.
 */
const MASCARA = {
  start: "linear-gradient(to right, transparent, #000 var(--scroll-fade-size, 20px))",
  end: "linear-gradient(to right, #000 calc(100% - var(--scroll-fade-size, 20px)), transparent)",
  both: "linear-gradient(to right, transparent, #000 var(--scroll-fade-size, 20px), #000 calc(100% - var(--scroll-fade-size, 20px)), transparent)",
} as const

function ScrollFade({ className, style, onScroll, children, ...props }: React.ComponentProps<"div">) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [borda, setBorda] = React.useState<keyof typeof MASCARA | null>(null)

  const medir = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    const inicio = el.scrollLeft > 1
    const fim = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setBorda(inicio && fim ? "both" : inicio ? "start" : fim ? "end" : null)
  }, [])

  React.useLayoutEffect(() => {
    medir()
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [medir])

  const mascara = borda ? MASCARA[borda] : undefined
  return (
    <div
      ref={ref}
      data-slot="scroll-fade"
      data-fade={borda ?? undefined}
      className={cn("overflow-x-auto", className)}
      style={{ ...style, maskImage: mascara, WebkitMaskImage: mascara }}
      onScroll={(e) => {
        medir()
        onScroll?.(e)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export { ScrollFade }
