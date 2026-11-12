import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../lib/i18n';
import { MedidorDeGasto } from './MedidorDeGasto';
import type { Budget } from '../lib/api-types';

const base: Budget = {
  id: 'b',
  projectId: 'p',
  sessionId: null,
  limitMicros: 100_000_000,
  spentMicros: 75_000_000,
  policy: 'allow',
  lastThresholdNotified: 0,
  periodo: { inicio: '2026-11-01', fim: '2026-12-01', diasRestantes: 18, previsaoMicros: 120_000_000 },
};

const ver = (b: Budget | null) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MedidorDeGasto budget={b} />
    </I18nextProvider>,
  );

describe('MedidorDeGasto (RN-1210)', () => {
  beforeAll(() => i18n.changeLanguage('pt-BR'));
  afterAll(() => i18n.changeLanguage('en'));

  it('com teto: gasto do mês, faixa de aviso e previsão da api', () => {
    ver(base);
    const m = screen.getByTestId('medidor-de-gasto');
    expect(m.dataset.threshold).toBe('warning');
    expect(m.textContent).toMatch(/mês/);
    expect(m.textContent).toMatch(/18 dias/);
  });

  it('sem teto: diz "sem teto", barra neutra e nenhuma previsão', () => {
    ver(null);
    const m = screen.getByTestId('medidor-de-gasto');
    expect(m.dataset.threshold).toBe('none');
    expect(m.textContent).toMatch(/sem teto/);
    expect(m.textContent).not.toMatch(/previsão/);
  });
});
