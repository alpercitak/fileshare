import { useAtomValue } from 'jotai';
import { peersAtom } from '../store/fileshare';
import styles from './PeerList.module.css';

export const PeerList = () => {
  const peers = useAtomValue(peersAtom);

  return (
    <div className={styles.root}>
      <div className={styles.item}>Peers ({peers.length})</div>
      {peers.map((peerId) => (
        <div className={styles.item} key={peerId}>
          {peerId}
        </div>
      ))}
    </div>
  );
};
