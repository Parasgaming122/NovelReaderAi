/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['wasmoon', 'cheerio', 'iconv-lite'],
  },
};

module.exports = nextConfig;
