import { useSetAtom } from 'jotai';

import { sendFileAtom } from '../store/fileshare';

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
    <div class="item">
      <input class="file-picker" type="file" onChange={handleFileChange} />
    </div>
  );
};
