/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://hagon.dev",
    generateRobotsTxt: true,
    exclude: ["/projects/new", "/api/*"],
};
