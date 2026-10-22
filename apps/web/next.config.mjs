/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@growmate/api", "@growmate/db", "@growmate/type"],
  serverExternalPackages: ["pino", "pino-pretty"],
  logging: {
    incomingRequests: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
