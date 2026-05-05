import { useState } from 'preact/hooks';
import styles from './index.module.css';

interface Props {
  status: string;
  roomCode: string | null;
  onCreate: () => void;
  onJoin: (code: string) => void;
}

export const RoomManager = ({ status, roomCode, onCreate, onJoin }: Props) => {
  const [input, setInput] = useState('');

  if (status === 'idle') {
    return (
      <div className={styles['room-manager']}>
        <button onClick={onCreate}>create room</button>
        <div className={styles['room-manager__input-container']}>
          <input
            className={styles['room-manager__input']}
            placeholder="room code"
            value={input}
            onInput={(e) => setInput(e.currentTarget.value.toUpperCase())}
          />
          <button onClick={() => onJoin(input)}>join</button>
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
