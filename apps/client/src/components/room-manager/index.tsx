import { useState } from 'preact/hooks';
import { Button } from '@/components/button';
import type { ConnectionStatus } from '@/types';
import styles from './index.module.css';

interface RoomManagerProps {
  status: ConnectionStatus;
  roomCode: string | null;
  signalingOpen: boolean;
  onCreate: () => void;
  onJoin: (code: string) => void;
}

export const RoomManager = ({ status, roomCode, signalingOpen, onCreate, onJoin }: RoomManagerProps) => {
  const [input, setInput] = useState('');

  if (status === 'idle') {
    return (
      <div className={styles['room-manager']}>
        <Button onClick={onCreate} disabled={!signalingOpen}>
          create room
        </Button>
        <div className={styles['room-manager__input-container']}>
          <input
            className={styles['room-manager__input']}
            placeholder="room code"
            value={input}
            onInput={(e) => setInput(e.currentTarget.value.toUpperCase())}
          />
          <Button onClick={() => onJoin(input)} disabled={!signalingOpen}>
            join
          </Button>
        </div>
        {!signalingOpen && <div className={styles['room-manager__status']}>connecting to server...</div>}
      </div>
    );
  }

  if (status === 'connecting' && roomCode) {
    return (
      <div>
        room: <strong>{roomCode}</strong>
        <div className={styles['room-manager__status']}>Waiting for peer...</div>
      </div>
    );
  }

  return null;
};
