import type { InboundTransfer, OutboundTransfer } from '@/types';
import styles from './index.module.css';

interface Props {
  inbound: Record<string, InboundTransfer>;
  outbound: Record<string, OutboundTransfer>;
}

const InboundTransferItem = ({ transfer }: { transfer: InboundTransfer }) => {
  const statusText = transfer.chunks.filter(Boolean).length === transfer.header.totalChunks ? 'Received' : 'Receiving';
  return (
    <div key={transfer.transferId} className={styles['transfer-list__item']}>
      <div className={styles['transfer-list__item-header']}>
        <div>
          <span>{transfer.header.name}</span>
          <span className={styles['transfer-list__item-status']}>({statusText})</span>
        </div>
        {transfer.url && (
          <a href={transfer.url} download={transfer.header.name} className={styles['transfer-list__item-download']}>
            download
          </a>
        )}
      </div>
      <progress
        value={transfer.chunks.filter(Boolean).length}
        max={transfer.header.totalChunks}
        className={styles['transfer-list__progress']}
      />
    </div>
  );
};

const OutboundTransferItem = ({ transfer }: { transfer: OutboundTransfer }) => {
  const statusText = transfer.sentChunks === transfer.totalChunks ? 'Sent' : 'Sending';
  return (
    <div key={transfer.transferId} className={styles['transfer-list__item']}>
      <div>
        <span>{transfer.name}</span>
        <span className={styles['transfer-list__item-status']}>({statusText})</span>
      </div>
      <progress value={transfer.sentChunks} max={transfer.totalChunks} className={styles['transfer-list__progress']} />
    </div>
  );
};

export const TransferList = ({ inbound, outbound }: Props) => {
  return (
    <div className={styles['transfer-list']}>
      {Object.values(outbound).map((transfer) => (
        <OutboundTransferItem key={transfer.transferId} transfer={transfer} />
      ))}
      {Object.values(inbound).map((transfer) => (
        <InboundTransferItem key={transfer.transferId} transfer={transfer} />
      ))}
    </div>
  );
};
