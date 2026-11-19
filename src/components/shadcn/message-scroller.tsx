import * as React from "react"
import { ArrowDownIcon } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

/**
 * Message Scroller (cópia à mão do shadcn.io, AT-959): a casca do fio com
 * Viewport, Content e Button. Sem `use-stick-to-bottom`: quem decide "seguir
 * ou pausar" é o `useRolagemDoFio` (RN-977), que liga os refs e o `afastado`.
 */
function MessageScroller({
  className,
  ref,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      data-slot="message-scroller"
      role="log"
      className={cn("overflow-y-auto", className)}
      {...props}
    />
  )
}

function MessageScrollerContent({
  className,
  ref,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      data-slot="message-scroller-content"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

/** "Ir ao fim · N novas": aparece só com o fio pausado; pega carona num wrapper sticky de altura zero. */
function MessageScrollerButton({
  visivel,
  rotulo,
  onClick,
}: {
  visivel: boolean
  rotulo: string
  onClick: () => void
}) {
  if (!visivel) return null
  return (
    <div
      data-slot="message-scroller-button"
      className="sticky bottom-3 flex h-0 justify-center"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="-translate-y-full rounded-full"
        onClick={onClick}
      >
        <ArrowDownIcon />
        {rotulo}
      </Button>
    </div>
  )
}

export { MessageScroller, MessageScrollerContent, MessageScrollerButton }
