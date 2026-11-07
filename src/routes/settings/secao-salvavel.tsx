
import { useTranslation } from 'react-i18next';

import { Badge } from '../../components/ui/Badge';
import styles from '../ProjectSettingsTab.module.css';

/**
 * O que um texto digitado quer dizer, ou que ele não quer dizer nada.
 *
 * Duas variantes e não `{ valido: boolean; valor?: TValor }` porque `null` é um
 * VALOR legítimo aqui (o `Teto de gasto` vazio é "sem teto", que a api grava
 * como `budgetMicros: null`). Um campo opcional não distinguiria "não tem
 * valor" de "o valor é a ausência de teto", e foi exatamente essa confusão que
 * a `BudgetSection` já tinha resolvido no comentário do `numero`.
 */
export type Interpretacao<TValor> =
  | { valido: true; valor: TValor }
  | { valido: false };

export interface ConfigDeSecao<TItem, TValor> {
  /** As linhas da seção, na ordem em que a tela as mostra. */
  itens: TItem[] | undefined;
  chaveDe: (item: TItem) => string;
  /** O valor que o SERVIDOR tem hoje, na forma em que o campo o mostra. */
  textoDoServidor: (item: TItem) => string;
  interpretar: (texto: string) => Interpretacao<TValor>;
  salvar: (chave: string, valor: TValor) => Promise<unknown>;
  /** Releitura depois de a api confirmar ALGUMA linha (invalidação da query). */
  aoConcluir?: () => Promise<unknown> | void;
  /** A frase que a seção já tinha para UMA linha salva, com o nome dela. */
  sucessoDeUm: (chave: string) => string;
  /** O que dizer quando a api falha sem mensagem própria. */
  erroGenerico: string;
}

export interface SecaoSalvavel<TItem> {
  textoDe: (item: TItem) => string;
  editar: (chave: string, texto: string) => void;
  /** Chaves cujo rascunho difere do que o servidor tem. */
  sujas: string[];
  /** Subconjunto de `sujas` cujo texto não é interpretável. */
  invalidas: string[];
  salvando: boolean;
  podeSalvar: boolean;
  salvarSecao: () => Promise<void>;
}

/**
 * O que a seção deve à pessoa antes de ela clicar: QUANTAS linhas estão
 * pendentes, e não só que há algo pendente.
 *
 * Até aqui a única pista de "há trabalho não salvo" em toda a aba era o botão
 * desabilitado de `ExecutionModeSection` — um sinal por NEGAÇÃO, que some
 * justamente quando passa a haver algo a salvar. Com um botão por seção a
 * ausência de contagem fica pior: o botão diz "Salvar" igual com uma linha
 * suja e com cinco, e a pessoa não tem como conferir se editou o que achava
 * que tinha editado.
 *
 * A marca inválida SUBSTITUI a de não salvo em vez de somar-se a ela: as duas
 * juntas dão dois números sobre o mesmo conjunto (`invalidas` é subconjunto de
 * `sujas`), e quem tem valor inválido precisa do que BLOQUEIA o botão, não da
 * contagem geral. `role="status"` porque a mudança é a resposta a uma edição
 * feita em outro elemento — sem ele, quem usa leitor de tela descobre o estado
 * só ao chegar no botão desabilitado.
 */
export function MarcaDeNaoSalvo({
  sujas,
  invalidas,
}: {
  sujas: string[];
  invalidas: string[];
}) {
  const { t } = useTranslation('settings');
  if (sujas.length === 0) return null;
  const invalido = invalidas.length > 0;
  return (
    <span className={styles.naoSalvo} role="status">
      <Badge square tone={invalido ? 'danger' : 'warning'}>
        {invalido
          ? t('secao.invalidas', { count: invalidas.length })
          : t('secao.naoSalvas', { count: sujas.length })}
      </Badge>
    </span>
  );
}
