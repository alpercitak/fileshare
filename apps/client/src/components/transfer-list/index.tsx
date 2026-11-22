import clsx from 'clsx';
import type { InboundTransfer, OutboundTransfer } from '@/types';
import styles from './index.module.css';

interface TransferListProps {
  inbound: Record<string, InboundTransfer>;
  outbound: Record<string, OutboundTransfer>;
}

const InboundTransferItem = ({ transfer }: { transfer: InboundTransfer }) => {
  const statusText = transfer.error
    ? `Failed: ${transfer.error}`
    : transfer.savedTo
      ? `Saved to ${transfer.savedTo}`
      : transfer.done
        ? 'Received'
        : 'Receiving';
  return (
    <div key={transfer.transferId} className={styles['transfer-list__item']}>
      <div className={styles['transfer-list__item-header']}>
        <div>
          <span>{transfer.header.name}</span>
          <span
            className={clsx(
              styles['transfer-list__item-status'],
              transfer.error && styles['transfer-list__item-status--failed'],
            )}
          >
            ({statusText})
          </span>
        </div>
        {transfer.url && (
          <a href={transfer.url} download={transfer.header.name} className={styles['transfer-list__item-download']}>
            download
          </a>
        )}
      </div>
      <progress
        value={transfer.receivedChunks}
        max={transfer.header.totalChunks}
        className={styles['transfer-list__progress']}
      />
    </div>
  );
};

const OutboundTransferItem = ({ transfer }: { transfer: OutboundTransfer }) => {
  const statusText = transfer.error ? `Failed: ${transfer.error}` : transfer.done ? 'Sent' : 'Sending';
  return (
    <div key={transfer.transferId} className={styles['transfer-list__item']}>
      <div>
        <span>{transfer.name}</span>
        <span
          className={clsx(
            styles['transfer-list__item-status'],
            transfer.error && styles['transfer-list__item-status--failed'],
          )}
        >
          ({statusText})
        </span>
      </div>
      <progress value={transfer.sentChunks} max={transfer.totalChunks} className={styles['transfer-list__progress']} />
    </div>
  );
};

export const TransferList = ({ inbound, outbound }: TransferListProps) => (
  <div className={styles['transfer-list']}>
    {Object.values(outbound).map((transfer) => (
      <OutboundTransferItem key={transfer.transferId} transfer={transfer} />
    ))}
    {Object.values(inbound).map((transfer) => (
      <InboundTransferItem key={transfer.transferId} transfer={transfer} />
    ))}
  </div>
);
