import type { ButtonHTMLAttributes } from 'react';
import styles from './BotaoLink.module.css';

/** Ação em texto, no estilo de link do kit (AT-1005): sublinhada, à esquerda, `--text-primary` (passa AA nos dois temas). */
export function BotaoLink({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={[styles.link, className].filter(Boolean).join(' ')} />;
}
