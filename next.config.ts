import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: [],
  devIndicators: false,
  outputFileTracingIncludes: {
    '/*': ['./supabase/migrations/202611060001_initial.sql'],
  },
};
export default config;
