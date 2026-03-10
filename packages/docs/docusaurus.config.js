// @ts-check
const { themes: prismThemes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'FunctionSpace SDK',
  tagline: 'Build probability trading interfaces',
  favicon: 'img/favicon.ico',

  url: 'https://docs.functionspace.org',
  baseUrl: '/',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Custom fields accessible via useDocusaurusContext().siteConfig.customFields
  customFields: {
    fsBaseUrl: 'https://fs-core-api.onrender.com',
    fsDemoMarketId: 23,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    require.resolve('./src/plugins/sdk-webpack-plugin'),
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'FunctionSpace SDK',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'sdkSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/functionspace/fs_trading_sdk',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright ${new Date().getFullYear()} FunctionSpace.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'json', 'typescript'],
      },
    }),
};

module.exports = config;
