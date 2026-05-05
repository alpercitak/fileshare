import { FilePicker } from '@/components/FilePicker';
import { PeerList } from '@/components/PeerList';
import { TransferList } from '@/components/TransferList';
import { useFileshareConnection } from '@/hooks/useFileshareConnection';
import styles from './Home.module.css';

export const Home = () => {
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
