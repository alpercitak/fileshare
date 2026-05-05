import { useAtomValue } from 'jotai';

import { peersAtom } from '../store/fileshare';

export const PeerList = () => {
  const peers = useAtomValue(peersAtom);

  return (
    <div id="peers">
      <div class="item">Peers ({peers.length})</div>
      {peers.map((peerId) => (
        <div class="item" key={peerId}>
          {peerId}
        </div>
      ))}
    </div>
  );
};
