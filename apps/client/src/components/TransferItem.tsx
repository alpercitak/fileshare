import type { FileTransfer } from '@/types';
import { getDownloadHref, getTransferPercentage } from '@/utils';
import styles from './TransferItem.module.css';

type TransferItemProps = {
  file: FileTransfer;
};

export const TransferItem = ({ file }: TransferItemProps) => {
  const percentage = getTransferPercentage(file);
  const downloadHref = getDownloadHref(file);
  const className = [styles.root, file.chunks.length > 0 ? styles.inProgress : ''].filter(Boolean).join(' ');

  return (
    <div className={className} style={{ width: `${percentage}%` }}>
      <span className={styles.fileName}>{file.metadata.name}</span>
      <span className={styles.progress}>
        {percentage} / 100%
        {downloadHref ? (
          <>
            {' '}
            <a className={styles.downloadLink} href={downloadHref} download={file.metadata.name}>
              Download
            </a>
          </>
        ) : null}
      </span>
    </div>
  );
};
