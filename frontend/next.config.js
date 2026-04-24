/** @type {import('next').NextConfig} */
const nextConfig = {
  /* This setting tells Next.js to generate a static HTML/CSS/JS export */
  output: 'export',
  
  /* Optional: If you use the <Image /> component, you often need to disable 
     default optimization for static exports */
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;