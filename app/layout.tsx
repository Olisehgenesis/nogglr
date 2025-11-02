import "../src/index.css";
export const metadata = {
  metadataBase: new URL('https://nogglr.vercel.app'),
  title: "Nogglrs",
  description: "Nuons for You",
  openGraph: {
    title: "Nogglrs",
    description: "Nuons for You",
    url: "https://nogglr.vercel.app",
    siteName: "Nogglrs",
    images: [
      { url: "/ogpng.png", width: 1200, height: 630, alt: "Nogglrs" },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nogglrs",
    description: "Nuons for You",
    images: ["/ogpng.png"],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://nogglr.vercel.app/ogpng.png',
      button: {
        title: 'Open Nogglrs',
        action: { type: 'launch_miniapp', url: 'https://nogglr.vercel.app', name: 'Nogglrs', splashImageUrl: 'https://nogglr.vercel.app/ogpng.png', splashBackgroundColor: '#000000' }
      }
    })
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-urbanist">
      <body className="font-urbanist">
        {children}
      </body>
    </html>
  );
}


