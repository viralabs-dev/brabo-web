import { createContext, useContext, useEffect } from 'react';
import type { SecaoSalvavel } from './secao-salvavel';

export type Secao = Pick<SecaoSalvavel<never>, 'sujas' | 'invalidas' | 'salvarSecao' | 'descartar'>;
export interface Resumo {
  sujas: number;
  invalidas: number;
}
export interface Registro {
  publicar: (id: string, rotulo: string, secao: Secao) => void;
  retirar: (id: string) => void;
}
export interface Barra extends Resumo {
  salvando: boolean;
  salvar: () => void;
  descartar: () => void;
}

export const Contexto = createContext<Registro | null>(null);
export const ContextoDaBarra = createContext<Barra>({
  sujas: 0,
  invalidas: 0,
  salvando: false,
  salvar: () => {},
  descartar: () => {},
});

/** A seção se oferece ao cabeçalho; sem provedor (testes isolados) não faz nada. */
export function usePublicarNoCabecalho(id: string, rotulo: string, secao: Secao) {
  const registro = useContext(Contexto);
  useEffect(() => registro?.publicar(id, rotulo, secao));
  useEffect(() => () => registro?.retirar(id), [registro, id]);
}

