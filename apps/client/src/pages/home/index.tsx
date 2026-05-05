import { getPort } from '@fileshare/shared';
import { FileDrop } from '@/components/file-drop';
import { RoomManager } from '@/components/room-manager';
import { TransferList } from '@/components/transfer-list';
import { useWebRTC } from '@/hooks/useWebRTC';
import styles from './index.module.css';

const PORT = getPort();
const SOCKET_HOST = `${window.location.hostname}:${PORT}`;

export const Home = () => {
  const { status, roomCode, dataChannelOpen, inbound, outbound, error, actions } = useWebRTC(SOCKET_HOST);

  return (
    <div className={styles['home']}>
      <h1>fileshare</h1>
      <RoomManager status={status} roomCode={roomCode} onCreate={actions.createRoom} onJoin={actions.joinRoom} />
      {(status === 'connected' || dataChannelOpen) && (
        <>
          <FileDrop roomCode={roomCode} isOpen={dataChannelOpen} onFiles={(files) => files.forEach(actions.sendFile)} />
          <TransferList inbound={inbound} outbound={outbound} />
        </>
      )}
      {error && <div className={styles['home__error']}>{error}</div>}
    </div>
  );
};
