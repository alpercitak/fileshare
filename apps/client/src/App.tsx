import { FilePicker } from '@/components/FilePicker';
import { PeerList } from '@/components/PeerList';
import { TransferList } from '@/components/TransferList';
import { useFileshareConnection } from '@/hooks/useFileshareConnection';
import styles from './App.module.css';

const App = () => {
  useFileshareConnection();

  return (
    <div className={styles.root}>
      <PeerList />
      <div className={styles.files}>
        <FilePicker />
        <TransferList />
      </div>
    </div>
  );
};

export default App;
