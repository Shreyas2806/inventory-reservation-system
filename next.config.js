/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Prisma out of the Next.js bundle (uses native binaries)
  serverExternalPackages: ['@prisma/client', 'prisma'],

  // Skip redundant lint/type-check passes during `next build`
  // (run these separately in CI or pre-commit hooks)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false, // keep true type safety; set true only if needed as last resort
  },
};

module.exports = nextConfig;
