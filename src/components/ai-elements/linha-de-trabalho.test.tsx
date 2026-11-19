import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../lib/i18n';
import { LinhaDeTrabalho } from './linha-de-trabalho';

describe('linha de trabalho do turno (RN-1392, RN-1393)', () => {
  it('fechada: duração e passos numa linha só; o conteúdo abre no lugar', () => {
    render(<LinhaDeTrabalho passos={5} duracaoMs={14000}><p>dentro</p></LinhaDeTrabalho>);
    const linha = screen.getByTestId('linha-de-trabalho');
    expect(linha.textContent).toMatch(/(Trabalhou|Worked).*14\.0 s.*5/);
    expect(screen.queryByText('dentro')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('dentro')).toBeTruthy();
  });

  it('sem duracaoMs não inventa "0 s"', () => {
    render(<LinhaDeTrabalho passos={2}><p>x</p></LinhaDeTrabalho>);
    expect(screen.getByTestId('linha-de-trabalho').textContent).not.toMatch(/\d s\b/);
  });

  it('em curso nasce aberta, sem segundos', () => {
    render(<LinhaDeTrabalho emCurso passos={3} duracaoMs={9000}><p>dentro</p></LinhaDeTrabalho>);
    expect(screen.getByText('dentro')).toBeTruthy();
    expect(screen.getByTestId('linha-de-trabalho').textContent).not.toContain('9.0 s');
  });
});
