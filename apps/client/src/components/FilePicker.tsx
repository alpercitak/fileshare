import { useSetAtom } from 'jotai';
import { sendFileAtom } from '@/store';
import styles from './FilePicker.module.css';

export const FilePicker = () => {
  const sendFile = useSetAtom(sendFileAtom);

  const handleFileChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    await sendFile(file);
    input.value = '';
  };

  return (
    <div className={styles.root}>
      <input className={styles.input} type="file" onChange={handleFileChange} />
    </div>
  );
};
