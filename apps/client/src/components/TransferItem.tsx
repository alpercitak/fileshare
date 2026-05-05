import { getDownloadHref, getTransferPercentage } from '../lib/fileshare';
import type { FileTransfer } from '../types/fileshare';

type TransferItemProps = {
  file: FileTransfer;
};

export const TransferItem = ({ file }: TransferItemProps) => {
  const percentage = getTransferPercentage(file);
  const downloadHref = getDownloadHref(file);

  return (
    <div
      class={`item${file.chunks.length > 0 ? ' progress' : ''}`}
      style={{ width: `${percentage}%` }}
    >
      <span class="file-name">{file.metadata.name}</span>
      <span class="file-progress">
        {percentage} / 100%
        {downloadHref ? (
          <>
            {' '}
            <a href={downloadHref} download={file.metadata.name}>
              Download
            </a>
          </>
        ) : null}
      </span>
    </div>
  );
};
