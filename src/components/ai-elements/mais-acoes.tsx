import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../shadcn/dropdown-menu';

/**
 * AT-950 (RN-728): o menu "⋯" dos cartões do fio — o botão principal fica à vista e as ações
 * secundárias moram aqui, cada uma com o PRÓPRIO rótulo em texto (RN-102: nunca só em tooltip).
 */
export function MaisAcoes({ children }: { children: ReactNode }) {
  const { t } = useTranslation('sessionPage');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" legenda={t('cartao.maisAcoes')} />}
        data-testid="mais-acoes-do-cartao"
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
