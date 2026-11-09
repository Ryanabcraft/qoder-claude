import fs from 'node:fs';
import { defineConfig } from 'vitepress';

const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

const enSidebar = [
  {
    text: 'Guide',
    items: [
      { text: 'Start', link: '/guide/start' },
      { text: 'Update and uninstall', link: '/guide/maintenance' },
    ],
  },
  {
    text: 'Using',
    items: [
      { text: 'Models and accounts', link: '/usage/models-accounts' },
      { text: 'Search and images', link: '/usage/search-images' },
      { text: 'Dashboard', link: '/usage/dashboard' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'CLI', link: '/reference/cli' },
      { text: 'Configuration', link: '/reference/config' },
      { text: 'Endpoints and architecture', link: '/reference/endpoints-architecture' },
    ],
  },
  {
    text: 'Help',
    items: [
      { text: 'Troubleshooting', link: '/help/troubleshooting' },
      { text: 'Security', link: '/help/security' },
    ],
  },
  {
    text: 'Development',
    items: [{ text: 'Contributing', link: '/development/contributing' }],
  },
];

const ptSidebar = [
  {
    text: 'Guia',
    items: [
      { text: 'Começar', link: '/pt-BR/guide/start' },
      { text: 'Atualizar e desinstalar', link: '/pt-BR/guide/maintenance' },
    ],
  },
  {
    text: 'Usando',
    items: [
      { text: 'Modelos e contas', link: '/pt-BR/usage/models-accounts' },
      { text: 'Busca e imagens', link: '/pt-BR/usage/search-images' },
      { text: 'Dashboard', link: '/pt-BR/usage/dashboard' },
    ],
  },
  {
    text: 'Referência',
    items: [
      { text: 'CLI', link: '/pt-BR/reference/cli' },
      { text: 'Configuração', link: '/pt-BR/reference/config' },
      { text: 'Endpoints e arquitetura', link: '/pt-BR/reference/endpoints-architecture' },
    ],
  },
  {
    text: 'Ajuda',
    items: [
      { text: 'Solução de problemas', link: '/pt-BR/help/troubleshooting' },
      { text: 'Segurança', link: '/pt-BR/help/security' },
    ],
  },
  {
    text: 'Desenvolvimento',
    items: [{ text: 'Contribuir', link: '/pt-BR/development/contributing' }],
  },
];

export default defineConfig({
  base: '/qoder-claude/docs/',
  outDir: '../site/dist/docs',
  title: 'qoder-claude',
  description: 'Claude Code on Qoder models — install, usage, CLI and reference.',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/qoder-claude/docs/logo.png' }],
  ],
  themeConfig: {
    logo: '/logo.png',
    siteTitle: 'qoder-claude',
    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ryanabcraft/qoder-claude' },
      { icon: 'discord', link: 'https://ryanabcraft.github.io/qoder-claude/discord/' },
    ],
    editLink: {
      pattern: 'https://github.com/Ryanabcraft/qoder-claude/edit/main/docs-site/:path',
      text: 'Edit this page',
    },
    footer: {
      message: `MIT · v${pkg.version}`,
      copyright: 'Made by Ryanabcraft',
    },
    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: 'Previous', next: 'Next' },
    lastUpdated: {
      text: 'Updated',
      formatOptions: { dateStyle: 'medium' },
    },
    darkModeSwitchLabel: 'Theme',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Back to top',
    langMenuLabel: 'Language',
    externalLinkIcon: true,
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      link: '/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/start' },
          { text: 'Reference', link: '/reference/cli' },
          { text: 'Help', link: '/help/troubleshooting' },
        ],
        sidebar: enSidebar,
      },
    },
    'pt-BR': {
      label: 'Português',
      lang: 'pt-BR',
      link: '/pt-BR/',
      themeConfig: {
        nav: [
          { text: 'Guia', link: '/pt-BR/guide/start' },
          { text: 'Referência', link: '/pt-BR/reference/cli' },
          { text: 'Ajuda', link: '/pt-BR/help/troubleshooting' },
        ],
        sidebar: ptSidebar,
        outline: { level: [2, 3], label: 'Nesta página' },
        docFooter: { prev: 'Anterior', next: 'Próxima' },
        lastUpdated: { text: 'Atualizado', formatOptions: { dateStyle: 'medium' } },
        darkModeSwitchLabel: 'Tema',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Voltar ao topo',
        langMenuLabel: 'Idioma',
        editLink: {
          pattern: 'https://github.com/Ryanabcraft/qoder-claude/edit/main/docs-site/:path',
          text: 'Editar esta página',
        },
      },
    },
  },
  sitemap: {
    hostname: 'https://ryanabcraft.github.io/qoder-claude/docs/',
  },
  ignoreDeadLinks: false,
});
