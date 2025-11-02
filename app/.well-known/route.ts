import { NextResponse } from 'next/server'

export async function GET() {
  const base = 'https://nogglr.vercel.app'

  const manifest = {
    miniapp: {
      version: '1',
      name: 'Nogglrs',
      iconUrl: `${base}/api/og/nft/random`,
      homeUrl: `${base}`,
      imageUrl: `${base}/api/og/nft/random`,
      buttonTitle: 'Open Nogglrs',
      splashImageUrl: `${base}/api/og/nft/random`,
      splashBackgroundColor: '#000000',
      requiredChains: [
        'eip155:42220',
      ],
      requiredCapabilities: [
        'actions.composeCast',
        'wallet.getEthereumProvider',
      ],
    },
  }

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  })
}


