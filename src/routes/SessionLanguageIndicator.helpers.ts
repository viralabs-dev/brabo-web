import type { SessionResponseLanguage } from '../lib/api-types';

import {
  IDIOMA_AUTOMATICO,
} from '../lib/idioma-da-resposta';

/**
 * O que a pessoa receberia SEM o override desta sessão: a mesma cadeia da
 * api (RN-618) sem o primeiro degrau — conta > detectado confirmado >
 * interface. Derivada no cliente a partir da cadeia que a rota já devolve,
 * sem endpoint novo, para o rótulo "Seguir a Conta" dizer em QUE idioma isso
 * dá; a api continua sendo a fonte do efetivo.
 */
export function idiomaSemOverride(r: SessionResponseLanguage): string {
  if (r.account !== IDIOMA_AUTOMATICO) return r.account;
  return r.detected ?? r.interfaceLocale;
}
