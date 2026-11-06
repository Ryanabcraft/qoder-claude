export const REPO = 'https://github.com/Ryanabcraft/qoder-claude';

export const INSTALL = [
  {
    id: 'cmd',
    label: 'Windows · CMD',
    code: 'curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.cmd -o install.cmd && install.cmd && del install.cmd',
  },
  {
    id: 'ps',
    label: 'Windows · PowerShell',
    code: 'irm https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.ps1 | iex',
  },
  {
    id: 'sh',
    label: 'Linux · macOS',
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

export const LIMITS = [
  ['Latency', '~2s with a warm worker, 10–15s while the pool refills'],
  ['Context', 'the full history is serialized into every request'],
  ['Transport', 'the CLI is the only path; the API body is signed'],
  ['Tools', 'negotiated in text, converted to tool_use by the bridge'],
];
