import type { HTMLAttributes } from 'preact/compat';
import styles from './index.module.css';

export const Button = ({ children, ...rest }: HTMLAttributes<HTMLButtonElement>) => (
  <button className={styles['button']} {...rest}>
    {children}
  </button>
);
