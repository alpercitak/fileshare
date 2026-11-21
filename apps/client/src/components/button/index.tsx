import type { ButtonHTMLAttributes } from 'preact';
import styles from './index.module.css';

export const Button = ({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={styles['button']} {...rest}>
    {children}
  </button>
);
