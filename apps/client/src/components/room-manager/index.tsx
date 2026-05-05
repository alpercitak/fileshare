import { useState } from 'preact/hooks';
import { Button } from '@/components/button';
import { ConnectionStatus } from '@/types';
import styles from './index.module.css';

interface Props {
  status: ConnectionStatus;
  roomCode: string | null;
  onCreate: () => void;
  onJoin: (code: string) => void;
}

export const RoomManager = ({ status, roomCode, onCreate, onJoin }: Props) => {
  const [input, setInput] = useState('');

  if (status === 'idle') {
    return (
      <div className={styles['room-manager']}>
        <Button onClick={onCreate}>create room</Button>
        <div className={styles['room-manager__input-container']}>
          <input
            className={styles['room-manager__input']}
            placeholder="room code"
            value={input}
            onInput={(e) => setInput(e.currentTarget.value.toUpperCase())}
          />
          <Button onClick={() => onJoin(input)}>join</Button>
        </div>
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
