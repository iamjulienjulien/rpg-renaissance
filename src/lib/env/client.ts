// src/lib/env/client.ts
export const clientEnv = {
    appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "",
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "",
};
