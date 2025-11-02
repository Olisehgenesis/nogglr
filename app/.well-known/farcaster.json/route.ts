import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const origin = `${url.protocol}//${url.host}`

  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjgxMDc4MiwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDAzQzI1RTVGYTNiMjIwRjdhRDExODA5MTQ5YjA2OTg1NkRFMDhlNGEifQ",
      payload: "eyJkb21haW4iOiJub2dnbHIudmVyY2VsLmFwcCJ9",
      signature: "JzmPOPJp32G9iQ2KkvcSPxpFyuTepma16XCFNWqnqGd0hqsyyhR6E7k6UJMb72GcL8EQreAKFI/wpJU45xHRUxs="
    },
    frame: {
      version: "1",
      name: "Nogglr",
      iconUrl: `${origin}/ogpng.png`,
      homeUrl: `${origin}/`,
      splashImageUrl: `${origin}/ogpng.png`,
      splashBackgroundColor: "#1a1a1a",
      subtitle: "NFT Generator and Marketplace",
      description: "Create and trade unique NFT avatars with custom traits",
      screenshotUrls: [],
      primaryCategory: "art-creativity",
      tags: ["nft","generator","marketplace","avatar","art"],
      heroImageUrl: `${origin}/ogpng.png`,
      tagline: "Create unique NFT avatars",
      ogTitle: "Nogglr NFT Generator",
      ogDescription: "Create and trade unique NFT avatars with custom traits on Celo",
      ogImageUrl: `${origin}/ogpng.png`,
      requiredChains: ["eip155:42220"],
      requiredCapabilities: ["actions.ready","wallet.getEthereumProvider"],
      noindex: false
    }
  }

  return NextResponse.json(manifest, {
    headers: { 'Cache-Control': 'public, max-age=3600' }
  })
}


