import { Button } from '@/components/button';
import { FileDrop } from '@/components/file-drop';
import { RoomManager } from '@/components/room-manager';
import { TransferList } from '@/components/transfer-list';
import { useWebRTC } from '@/hooks/useWebRTC';
import styles from './index.module.css';

const SOCKET_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

export const Home = () => {
  const { status, roomCode, dataChannelOpen, verificationCode, inbound, outbound, error, saveFolder, actions } =
    useWebRTC(SOCKET_URL);
  const hasTransfers = Object.keys(inbound).length > 0 || Object.keys(outbound).length > 0;

  return (
    <div className={styles['home']}>
      <h1>fileshare</h1>
      <RoomManager status={status} roomCode={roomCode} onCreate={actions.createRoom} onJoin={actions.joinRoom} />
      {dataChannelOpen && actions.chooseSaveFolder && (
        <div className={styles['home__save-folder']}>
          <Button onClick={actions.chooseSaveFolder}>
            {saveFolder ? `saving to: ${saveFolder}` : 'save incoming files to a folder'}
          </Button>
        </div>
      )}
      {dataChannelOpen && <FileDrop roomCode={roomCode} onFiles={(files) => files.forEach(actions.sendFile)} />}
      {verificationCode && (
        <div className={styles['home__verify']}>
          verify code: <strong>{verificationCode}</strong>
          <span className={styles['home__verify-hint']}>must match on both devices</span>
        </div>
      )}
      {(dataChannelOpen || hasTransfers) && <TransferList inbound={inbound} outbound={outbound} />}
      {error && <div className={styles['home__error']}>{error}</div>}
    </div>
  );
};
