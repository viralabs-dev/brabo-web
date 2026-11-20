import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"


// AT-1010 (RN-1500): o alvo é de 24 px (`size-6`) e a caixa visível de 16 px é o `::before`; a margem negativa devolve os 4 px por lado ao fluxo, e nenhuma linha cresce.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative -m-1 flex size-6 shrink-0 items-center justify-center rounded-[4px] outline-none transition-colors before:absolute before:size-4 before:rounded-[4px] before:border before:border-input before:transition-colors group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 focus-visible:before:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:before:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:before:border-primary dark:before:bg-input/30 dark:aria-invalid:before:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:text-primary-foreground data-checked:before:border-primary data-checked:before:bg-primary dark:data-checked:before:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="relative grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon/>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
