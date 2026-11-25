import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Marker: marca de um instante no fio, com o texto no meio e uma linha de cada
 * lado (cópia à mão do Marker do shadcn.io, sem pacote; cor e espaço de
 * `design/tokens.css`). Usado no divisor de handoff da sessão (AT-955).
 */
function Marker({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="marker"
      className={cn(
        "flex items-center justify-center gap-3 py-0.5 text-[length:var(--text-sm,12px)] text-(--text-secondary)",
        "before:h-px before:flex-1 before:bg-(--border) before:content-['']",
        "after:h-px after:flex-1 after:bg-(--border) after:content-['']",
        className
      )}
      {...props}
    />
  )
}

export { Marker }
