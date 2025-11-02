import { useAccount, useConnect } from 'wagmi';
import { Button } from '@/components/ui/button';

export function ConnectMenu() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  const handleConnect = () => {
    console.log('Connect button clicked, connecting with first available connector...');
    // Connect directly with the first available connector (MetaMask)
    if (connectors[0]) {
      connect({ connector: connectors[0] });
    }
  };

  if (isConnected) {
    return (
      <div className="connect-section-header">
        <div className="connected-info-header">
          <span className="address-header">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      className="connect-btn"
    >
      Connect Your Wallet
    </Button>
  );
}
