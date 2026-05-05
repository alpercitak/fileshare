import { render } from 'preact';
import App from './App';
import '../index.less';

render(<App />, document.getElementById('app') as HTMLElement);
