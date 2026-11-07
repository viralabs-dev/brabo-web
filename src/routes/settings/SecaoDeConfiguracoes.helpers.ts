import {
  createContext,
  useContext,
} from 'react';

import type { RegistroDoSumario } from './SecaoDeConfiguracoes';

export const SumarioContext = createContext<RegistroDoSumario | undefined>(undefined);

/**
 * O registro, para o sumário. Fora do provedor devolve um registro VAZIO em
 * vez de estourar: as seções são renderizadas isoladamente em teste, e uma
 * seção não deve exigir a aba inteira em volta para montar.
 */
export const REGISTRO_VAZIO: RegistroDoSumario = {
  presentes: [],
  ativa: undefined,
  irPara: () => {},
  registrar: () => () => {},
};

export function useSumario(): RegistroDoSumario {
  return useContext(SumarioContext) ?? REGISTRO_VAZIO;
}
