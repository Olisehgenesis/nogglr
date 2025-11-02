/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  experimental: {
    optimizePackageImports: [
      "react",
      "react-dom",
      "wagmi",
      "@tanstack/react-query",
    ],
  },
  async redirects() {
    return [
      // Legacy path with path param → new path
      {
        source: '/NFTPage/:tokenId',
        destination: '/nft/:tokenId',
        permanent: false,
      },
      // Legacy static path → home
      {
        source: '/NFTPage',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;


