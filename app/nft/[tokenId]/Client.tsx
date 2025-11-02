"use client";
import { useParams } from 'next/navigation';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { config, queryClient } from '../../../src/walletkit';
import { NFTPage as NFTDetail } from '../../../src/components/NFTPage';

export default function NftClient() {
  const params = useParams<{ tokenId: string }>();
  const initialPath = `/nft/${params?.tokenId ?? ''}`;
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/nft/:tokenId" element={<NFTDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}


