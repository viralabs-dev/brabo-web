import { useTranslation } from 'react-i18next';

/**
 * "Voltar a herdar" nos DOIS registros tipográficos em que a aba o usa.
 *
 * `rotulo` é o botão de verdade (`Modelo por área`); `rotuloInline` é o link
 * discreto de 11px em mono dentro da célula da tabela de `Modelos por agente`,
 * onde caixa alta competiria com o `ModelPicker` da linha — a escolha está
 * documentada em `.voltarHerdar`, no CSS. As duas saem da MESMA chave: o
 * registro é typographic, o vocabulário é um só, e não há como uma mudar sem
 * a outra.
 *
 * `toLocaleLowerCase` e não `text-transform: lowercase` porque o rótulo é o
 * NOME ACESSÍVEL do botão: CSS mudaria o pixel e deixaria a tecnologia
 * assistiva (e o teste que consulta por `name`) lendo a outra forma.
 */
export function useVoltarAHerdar() {
  const { t } = useTranslation('settings');
  const rotulo = t('heranca.voltarAHerdar');
  return { rotulo, rotuloInline: rotulo.toLocaleLowerCase() };
}
