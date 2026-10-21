import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   poweredByHeader: false,
   async redirects() {
      // Former standalone pages now live as sections on the home page
      return [
         { source: "/about", destination: "/#about", permanent: true },
         { source: "/skills", destination: "/#about", permanent: true },
         { source: "/contact", destination: "/#contact", permanent: true },
         // The flagship was renamed when the robot's real hardware was confirmed
         {
            source: "/projects/perception-arm",
            destination: "/projects/mobile-manipulator",
            permanent: true,
         },
      ];
   },
   async headers() {
      return [
         {
            source: "/:path*",
            headers: [
               { key: "X-Content-Type-Options", value: "nosniff" },
               { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
               { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            ],
         },
      ];
   },
};

export default nextConfig;
