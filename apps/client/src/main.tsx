import { render } from 'preact';
import { Home } from '@/pages/Home';
import '@/styles/global.css';

const elem = document.getElementById('root')!;

render(<Home />, elem);
