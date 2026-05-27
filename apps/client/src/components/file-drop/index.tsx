import { clsx } from 'clsx';
import styles from './index.module.css';

interface FileDropProps {
  onFiles: (files: Array<File>) => void;
  roomCode: string | null;
  isOpen: boolean;
}

export const FileDrop = ({ onFiles, roomCode, isOpen }: FileDropProps) => {
  const handlePick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      onFiles(Array.from((e.target as HTMLInputElement).files ?? []));
    };
    input.click();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    onFiles(Array.from(e.dataTransfer?.files ?? []));
  };

  return (
    <>
      <div>
        room: <strong>{roomCode}</strong>
        <span className={clsx(styles['file-drop__status'], isOpen && styles['file-drop__status--connected'])}>
          {isOpen ? '● connected' : '○ signaling…'}
        </span>
      </div>
      <div
        onClick={handlePick}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className={styles['file-drop__file-drop-area']}
      >
        drop files here or click to pick
      </div>
    </>
  );
};
