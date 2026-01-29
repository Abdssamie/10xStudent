/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@xstudent/database'],
  experimental: {
    serverComponentsExternalPackages: ['postgres'],
  },
}

export default nextConfig
