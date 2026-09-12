const isGhPages = process.env.DEPLOY_TARGET === "gh-pages";

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: isGhPages ? "/cineapp" : "",
  assetPrefix: isGhPages ? "/cineapp/" : undefined,
  output: isGhPages ? "export" : undefined,
  trailingSlash: isGhPages ? true : false,
  images: {
    unoptimized: isGhPages ? true : false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
    ],
  },
};

export default nextConfig;
