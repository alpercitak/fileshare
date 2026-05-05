import { FilePicker } from './components/FilePicker';
import { PeerList } from './components/PeerList';
import { TransferList } from './components/TransferList';
import { useFileshareConnection } from './hooks/useFileshareConnection';

const App = () => {
  useFileshareConnection();

  return (
    <div id="container">
      <PeerList />
      <div id="files">
        <FilePicker />
        <TransferList />
      </div>
    </div>
  );
};

export default App;
