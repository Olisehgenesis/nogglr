import type { Metadata } from 'next'
import NftClient from './Client'

export async function generateMetadata({ params }: { params: { tokenId: string } }): Promise<Metadata> {
  const tokenId = params.tokenId
  const base = 'https://nogglr.vercel.app'
  const title = `Nogglrs #${tokenId}`
  const description = 'Nuons for You'
  const imageUrl = `${base}/api/og/nft/${encodeURIComponent(tokenId)}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/nft/${tokenId}`,
      siteName: 'Nogglrs',
      images: [
        { url: imageUrl, width: 1200, height: 630, alt: title },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default function Page() {
  return <NftClient />
}


