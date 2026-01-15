import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "nbmoyzhmvloenjudjtvy.supabase.co",
                pathname: "/storage/v1/object/**",
            },
            {
                protocol: "https",
                hostname: "zdyvxnsasgauvalfmgsa.supabase.co",
                pathname: "/storage/v1/object/**",
            },
        ],
    },
    logging: false,
};

export default nextConfig;
