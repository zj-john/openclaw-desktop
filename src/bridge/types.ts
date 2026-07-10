export type OAuthProvider = {
  id: string;
  label: string;
};

export type LocalOAuthToolStatus = {
  id: string;
  label: string;
  providerId: string;
  cliFound: boolean;
  authDetected: boolean;
  source: string;
  detail?: string;
};

export type CodexAuthStatus = {
  detected: boolean;
  source: string;
  lastRefresh?: string;
  tokenFields: string[];
};

export type CodexConnectivityStatus = {
  ok: boolean;
  expected: string;
  response?: string;
  error?: string;
  command: string;
};

export type LocalCodexReuseResult = {
  reused: boolean;
  profileId?: string;
  model?: string;
  message: string;
  error?: string;
};

export type OAuthLoginResult = {
  providerId: string;
  launched: boolean;
  commandHint: string;
  details: string;
};

export type OllamaStatus = {
  endpoint: string;
  reachable: boolean;
  models: string[];
  error?: string;
};

export type OllamaApplyResult = {
  endpoint: string;
  model: string;
  discoveredModels: string[];
};

export type OfficialWebStatus = {
  ready: boolean;
  installed: boolean;
  running: boolean;
  started: boolean;
  url: string;
  commandHint: string;
  message: string;
  error?: string;
};

export type OpenOfficialWebResult = {
  opened: boolean;
  url: string;
  detail: string;
};

export type BootstrapStatus = {
  ready: boolean;
  installed: boolean;
  initialized: boolean;
  onboardingDone: boolean;
  web: OfficialWebStatus;
  message: string;
  logs: string[];
  error?: string;
};

export type BrowserDetectedExecutable = {
  kind: string;
  path: string;
};

export type BrowserModeStatus = {
  mode: string;
  defaultProfile: string;
  executablePath?: string;
  detectedBrowsers: BrowserDetectedExecutable[];
};

export type BrowserRelayStatus = {
  installed: boolean;
  path?: string;
  commandHint: string;
  message: string;
  error?: string;
};

export type BrowserRelayDiagnostic = {
  relayUrl: string;
  relayReachable: boolean;
  extensionConnected?: boolean;
  tabsCount: number;
  likelyCause: string;
  detail: string;
  commandHint: string;
};

export type FeishuChannelStatus = {
  pluginInstalled: boolean;
  channelEnabled: boolean;
  hasCredentials: boolean;
  appId: string;
  error?: string;
};

export type SwitchToOpenClawUiResult = {
  switched: boolean;
  detail: string;
};

export type OpenEnterpriseSettingsResult = {
  opened: boolean;
  detail: string;
};

export type SaveChannelConfigResult = {
  channelId: string;
  enabled: boolean;
  configured: boolean;
};

export type SkipChannelConfigResult = {
  skipped: boolean;
  message: string;
};

/** Skills 白名单相关类型 */
export type EnterpriseSkillDef = {
  id: string;
  name: string;
  required?: boolean;
  reason?: string;
  defaultEnabled?: boolean;
  description?: string;
  platform?: string;
};

export type EnterpriseSkillCategory = {
  id: string;
  name: string;
  description: string;
  skills: EnterpriseSkillDef[];
};

export type EnterpriseBlacklistItem = {
  id: string;
  reason: string;
};

export type EnterpriseSkillsConfig = {
  version: number;
  lastUpdated: string;
  categories: EnterpriseSkillCategory[];
  blacklist: EnterpriseBlacklistItem[];
};

export type GetEnterpriseSkillsResult = {
  config: EnterpriseSkillsConfig;
};

/** OpenClaw Web UI URL 返回类型 */
export type OpenClawWebUrlResult = {
  url: string;
  ready: boolean;
  running: boolean;
};

export type OpenClawBridge = {
  listOAuthProviders: () => Promise<OAuthProvider[]>;
  detectLocalOAuthTools: () => Promise<LocalOAuthToolStatus[]>;
  startOAuthLogin: (providerId: string) => Promise<OAuthLoginResult>;
  checkOllama: (endpoint?: string) => Promise<OllamaStatus>;
  applyOllamaConfig: (endpoint?: string, preferredModel?: string) => Promise<OllamaApplyResult>;
  bootstrapOpenClaw: () => Promise<BootstrapStatus>;
  selectWindowsPortableBundleFile: () => Promise<string | null>;
  bootstrapOpenClawWithSelectedBundle: (bundleZipPath: string) => Promise<BootstrapStatus>;
  ensureOfficialWebReady: () => Promise<OfficialWebStatus>;
  openOfficialWebWindow: () => Promise<OpenOfficialWebResult>;
  getBrowserModeStatus: () => Promise<BrowserModeStatus>;
  setBrowserMode: (mode: string) => Promise<BrowserModeStatus>;
  getBrowserRelayStatus: () => Promise<BrowserRelayStatus>;
  prepareBrowserRelay: () => Promise<BrowserRelayStatus>;
  diagnoseBrowserRelay: () => Promise<BrowserRelayDiagnostic>;
  saveApiKey: (
    providerId: string,
    apiKey: string,
    baseUrl?: string,
    defaultModel?: string
  ) => Promise<{ ok: boolean }>;
  detectLocalCodexAuth: () => Promise<CodexAuthStatus>;
  reuseLocalCodexAuth: (setDefaultModel?: boolean) => Promise<LocalCodexReuseResult>;
  validateLocalCodexConnectivity: () => Promise<CodexConnectivityStatus>;
  getFeishuChannelStatus: () => Promise<FeishuChannelStatus>;
  installFeishuPlugin: () => Promise<FeishuChannelStatus>;
  saveFeishuChannelConfig: (appId: string, appSecret: string) => Promise<FeishuChannelStatus>;
  switchToOpenClawUi: () => Promise<SwitchToOpenClawUiResult>;
  openEnterpriseSettings: () => Promise<OpenEnterpriseSettingsResult>;
  saveChannelConfig: (channelId: string, configJson: string) => Promise<SaveChannelConfigResult>;
  skipChannelConfig: () => Promise<SkipChannelConfigResult>;
  getEnterpriseSkills: () => Promise<GetEnterpriseSkillsResult>;
  markOnboardingCompleted: () => Promise<{ completed: boolean; message: string }>;
  /** 获取 OpenClaw Web UI 的完整 URL（含 auth token），用于内嵌显示 */
  getOpenClawWebUrl: () => Promise<OpenClawWebUrlResult>;
};
