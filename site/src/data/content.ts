export const REPO = 'https://github.com/Ryanabcraft/qoder-claude';

export const INSTALL = [
  {
    id: 'cmd',
    code: 'curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.cmd -o install.cmd && install.cmd && del install.cmd',
  },
  {
    id: 'ps',
    code: 'irm https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.ps1 | iex',
  },
  {
    id: 'sh',
    code: 'curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.sh | bash',
  },
] as const;

