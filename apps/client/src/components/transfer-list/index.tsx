import { InboundTransfer, OutboundTransfer } from '@/types';
import styles from './index.module.css';
interface Props {
  inbound: Record<string, InboundTransfer>;
  outbound: Record<string, OutboundTransfer>;
}

export const TransferList = ({ inbound, outbound }: Props) => {
  return (
    <div className={styles['transfer-list']}>
      {Object.values(outbound).map((transfer) => (
        <div key={transfer.transferId}>
          <div>{transfer.name} (Sending)</div>
          <progress
            value={transfer.sentChunks}
            max={transfer.totalChunks}
            className={styles['transfer-list__progress']}
          />
        </div>
      ))}
      {Object.values(inbound).map((transfer) => (
        <div key={transfer.transferId}>
          <div>{transfer.header.name} (Receiving)</div>
          <progress
            value={transfer.chunks.filter(Boolean).length}
            max={transfer.header.totalChunks}
            className={styles['transfer-list__progress']}
          />
          {transfer.url && (
            <a href={transfer.url} download={transfer.header.name}>
              download
            </a>
          )}
        </div>
      ))}
    </div>
  );
};
