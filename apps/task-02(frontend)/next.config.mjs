/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pos/shared-types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
