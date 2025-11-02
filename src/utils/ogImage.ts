// OG Image generation utility for Vite

export interface OGImageData {
  type: 'mint' | 'nft';
  tokenId?: string;
  name?: string;
  price?: string;
  imageUrl?: string;
  seed?: {
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
  };
}

export function generateOGImageUrl(_data: OGImageData): string {
  const baseUrl = 'https://nogglr.vercel.app';
  
  // Always use the OG image from assets
  return `${baseUrl}/ogpng.png`;
}


export function updatePageMetadata(data: OGImageData) {
  if (typeof window === 'undefined') return;
  
  const ogImageUrl = generateOGImageUrl(data);
  
  // Update meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  const fcMiniapp = document.querySelector('meta[name="fc:miniapp"]');
  const fcFrame = document.querySelector('meta[name="fc:frame"]');
  
  if (data.type === 'nft' && data.tokenId) {
    const pageUrl = `https://nogglr.vercel.app/nft/${data.tokenId}`;
    
    if (ogTitle) ogTitle.setAttribute('content', `${data.name || `Nogglr NFT #${data.tokenId}`} - Nogglr`);
    if (ogDescription) ogDescription.setAttribute('content', `Check out this unique Nogglr NFT! ${data.price ? `Price: ${data.price} CELO` : 'Not for sale'}`);
    if (ogImage) ogImage.setAttribute('content', ogImageUrl);
    if (ogUrl) ogUrl.setAttribute('content', pageUrl);
    
    // Update Farcaster embed metadata
    const embedData = {
      version: "1",
      imageUrl: ogImageUrl,
      button: {
        title: "Mint your Nogglr",
        action: {
          type: "launch_miniapp",
          name: "Nogglr",
          url: pageUrl,
          splashImageUrl: "https://nogglr.vercel.app/ogpng.png",
          splashBackgroundColor: "#1a1a1a"
        }
      }
    };
    
    if (fcMiniapp) fcMiniapp.setAttribute('content', JSON.stringify(embedData));
    
    // Update frame metadata for backward compatibility
    const frameData = { ...embedData };
    frameData.button.action.type = "launch_frame";
    if (fcFrame) fcFrame.setAttribute('content', JSON.stringify(frameData));
    
  } else if (data.type === 'mint') {
    if (ogTitle) ogTitle.setAttribute('content', 'Nogglr - NFT Generator & Marketplace');
    if (ogDescription) ogDescription.setAttribute('content', 'Create and trade unique NFT avatars with custom traits on Celo');
    if (ogImage) ogImage.setAttribute('content', ogImageUrl);
    if (ogUrl) ogUrl.setAttribute('content', 'https://nogglr.vercel.app');
    
    // Reset to default embed metadata
    const embedData = {
      version: "1",
      imageUrl: ogImageUrl,
      button: {
        title: "Mint your Nogglr",
        action: {
          type: "launch_miniapp",
          name: "Nogglr",
          url: "https://nogglr.vercel.app",
          splashImageUrl: "https://nogglr.vercel.app/ogpng.png",
          splashBackgroundColor: "#1a1a1a"
        }
      }
    };
    
    if (fcMiniapp) fcMiniapp.setAttribute('content', JSON.stringify(embedData));
    
    const frameData = { ...embedData };
    frameData.button.action.type = "launch_frame";
    if (fcFrame) fcFrame.setAttribute('content', JSON.stringify(frameData));
  }
}


