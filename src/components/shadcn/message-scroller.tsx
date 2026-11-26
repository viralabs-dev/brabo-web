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

/**
 * "Ir ao fim · N novas": aparece só com o fio pausado, numa FAIXA própria entre o
 * fio e a doca (RN-1510) — fora da área que rola, então empurra o fio em vez de
 * flutuar sobre os botões do último cartão. Altura de conteúdo (RN-1389).
 */
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
    <div data-slot="message-scroller-button" className="flex justify-center py-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={onClick}
      >
        <ArrowDownIcon />
        {rotulo}
      </Button>
    </div>
  )
}

export { MessageScroller, MessageScrollerContent, MessageScrollerButton }
