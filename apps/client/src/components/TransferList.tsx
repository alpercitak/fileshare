import { useAtomValue } from 'jotai';

import { filesAtom } from '../store/fileshare';
import { TransferItem } from './TransferItem';

export const TransferList = () => {
  const files = useAtomValue(filesAtom);
  const fileItems = Object.values(files);

  return (
    <>
      {fileItems.map((file) => (
        <TransferItem key={file.id} file={file} />
      ))}
    </>
  );
};
