import { Tabs, TabsList, TabsTrigger } from './shadcn/tabs';
import {
  abaPorChave,
  rotuloDeSub,
  secaoDaChave,
  type ChaveDeAba,
  type ContagensDeAba,
} from '../routes/project-tabs';

interface FaixaDeSubAbasProps {
  ativa: ChaveDeAba;
  contagens?: ContagensDeAba;
  onChange: (chave: ChaveDeAba) => void;
}

/**
 * A faixa de sub-abas no topo do conteúdo (ADR 0294): a mesma peça de
 * Configurações (`Tabs variant="casa"`). Só aparece em seção com mais de uma
 * sub-aba. O contador é de cada sub-aba, da mesma fonte da sidebar, nunca
 * somado (RN-467).
 */
export function FaixaDeSubAbas({ ativa, contagens, onChange }: FaixaDeSubAbasProps) {
  const secao = secaoDaChave(ativa);
  if (secao.subs.length < 2) return null;
  return (
    <Tabs value={ativa} onValueChange={(v) => onChange(v as ChaveDeAba)}>
      <TabsList variant="casa" aria-label={secao.label}>
        {secao.subs.map((sub) => {
          const n = contagens ? abaPorChave(sub).count?.(contagens) : undefined;
          return (
            <TabsTrigger key={sub} value={sub} variant="casa">
              {rotuloDeSub(sub)}
              {n ? ` ${n}` : null}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
