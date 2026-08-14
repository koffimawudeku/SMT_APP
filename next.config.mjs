/** @type {import('next').NextConfig} */
const nextConfig = {
  // Inclut le modèle Excel de la liasse dans le bundle serverless (sinon
  // introuvable à l'exécution sur Vercel).
  outputFileTracingIncludes: {
    "/liasse/download": ["./lib/liasse/template.xlsx"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
