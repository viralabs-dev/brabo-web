import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProposedAction } from '../lib/api-types';
import { useAcaoEstaNoBloco } from '../lib/acoes-no-bloco';
import { abrirFilaDePendencias } from '../lib/perguntas-em-aberto';
import { Button } from './ui/Button';

/**
 * RN-843 (AT-512): no fio, a ação PENDENTE que o bloco de pendências já
 * desenha como cartão vira uma linha que aponta para ele. Decidida, ou sem o
 * bloco montado, o fio mostra o cartão completo (`children`).
 */
export function CartaoOuReferenciaNoFio({
  action,
  children,
}: {
  action: ProposedAction;
  children: ReactNode;
}) {
  const { t } = useTranslation('sessionPage');
  const noBloco = useAcaoEstaNoBloco(action.id);
  if (action.status === 'pending' && noBloco) {
    return (
      <p data-testid="referencia-ao-bloco" role="note">
        {t('pendencias.referenciaNoFio')}{' '}
        {/* AT-753: a aba nasce fechada; o botão a abre. */}
        <Button variant="secondary" onClick={() => abrirFilaDePendencias('prontas')}>
          {t('pendencias.verOCartao')}
        </Button>
      </p>
    );
  }
  return <>{children}</>;
}
