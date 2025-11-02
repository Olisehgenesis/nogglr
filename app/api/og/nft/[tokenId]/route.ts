import { NextRequest, NextResponse } from 'next/server';
import { generateNFTOG } from '@/utils/ogImageGenerator';

// GET /api/og/nft/[tokenId]?format=svg|png
export async function GET(req: NextRequest, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') || undefined;
  const imageParam = searchParams.get('image') || '';

  // Support a pseudo-random showcase image with stable daily seed
  let numericTokenId: number;
  if (tokenId === 'random') {
    const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    numericTokenId = (day % 1000) + 1; // 1..1000 rotating daily
  } else {
    numericTokenId = Number(tokenId);
    if (!Number.isFinite(numericTokenId) || numericTokenId < 0) {
      return new NextResponse('Invalid tokenId', { status: 400 });
    }
  }

  // If an image URL is provided, render a simple card that frames the provided image
  if (imageParam) {
    const safeTitle = (name || `Nogglr #${numericTokenId}`).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeHref = imageParam.replace(/"/g, '&quot;');
    const cardSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#111827;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1f2937;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(48,48)">
    <rect x="0" y="0" width="540" height="540" rx="24" fill="#f3f4f6"/>
    <clipPath id="imgClip">
      <rect x="0" y="0" width="540" height="540" rx="24" />
    </clipPath>
    <image href="${safeHref}" x="0" y="0" width="540" height="540" preserveAspectRatio="xMidYMid slice" clip-path="url(#imgClip)"/>
  </g>
  <g transform="translate(624,120)">
    <text x="0" y="0" font-family="Urbanist, sans-serif" font-size="64" font-weight="700" fill="#ffffff">${safeTitle}</text>
    <text x="0" y="72" font-family="Urbanist, sans-serif" font-size="32" fill="#d1d5db">Nuons for You on Celo</text>
    <rect x="0" y="120" width="320" height="56" rx="28" fill="#8b5cf6"/>
    <text x="160" y="158" font-family="Urbanist, sans-serif" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">View on Nogglr</text>
    <text x="0" y="220" font-family="Urbanist, sans-serif" font-size="20" fill="#9ca3af">nogglr.vercel.app</text>
  </g>
</svg>`;
    return new NextResponse(cardSvg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Otherwise, generate a branded OG SVG using the Nouns-based generator
  const svg = generateNFTOG(numericTokenId, undefined, name || `Nogglr #${numericTokenId}`);

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
