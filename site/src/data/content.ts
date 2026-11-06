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

export const MODELS = [
  'Auto',
  'Ultimate',
  'Fast',
  'Efficient',
  'Sonus',
  'Cantus',
  'Qwen3.8-Max',
  'Qwen3.8-Flash',
  'Kimi-K3.1-Pro',
  'Kimi-K2.8-Preview',
  'GLM-5.3',
  'GLM-5.3-Flash',
  'DeepSeek-V4-Pro',
  'DeepSeek-Flash',
  'MiniMax-M3.1-Flash',
];
