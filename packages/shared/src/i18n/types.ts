/**
 * The message table's shape, kept apart from the tables themselves.
 *
 * Every locale file imports this type and nothing else, so adding a language is
 * adding a file rather than editing a thousand-line one, and two changes to two
 * different languages no longer touch the same lines.
 */
export interface I18nMessages {
  // UI text
  webOffice: string;
  uploadDocument: string;
  newWord: string;
  newExcel: string;
  newPowerPoint: string;
  themeLabel: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;

  // Messages
  fileSavedSuccess: string;
  documentLoaded: string;

  // Error messages
  failedToLoadEditor: string;
  unsupportedFileType: string;
  invalidFileObject: string;
  documentOperationFailed: string;
  openUrlFailed: string;
  openUrlUnreachable: string;
  editorErrorToast: string;
  editorErrorFormatMismatch: string;
  editorErrorOpenFailed: string;
  editorErrorOutOfMemory: string;
  editorOpenRetrying: string;

  // AI agent panel
  agentTitle: string;
  agentOpenTip: string;
  agentSettings: string;
  agentRoleUser: string;
  agentRoleTool: string;
  agentRoleError: string;
  agentProviderClaude: string;
  agentProviderOpenAI: string;
  agentProviderGemini: string;
  agentProviderLocal: string;
  agentProviderOllama: string;
  agentOllamaModelPlaceholder: string;
  agentOllamaHint: string;
  agentLoadModel: string;
  agentModelLoaded: string;
  agentCheckingCache: string;
  agentModelCached: string;
  /** `{size}` placeholder is replaced with the model's download size. */
  agentModelFirstDownload: string;
  agentNoWebGPU: string;
  agentLocalChatOnly: string;
  agentSwitchCloud: string;
  agentReviewMode: string;
  agentQuote: string;
  agentQuoteTip: string;
  agentClear: string;
  agentInputPlaceholder: string;
  agentSend: string;
  agentStop: string;
  agentNeedKey: string;
  agentNoSelection: string;
  agentQuotePrefix: string;
  agentStopped: string;
  agentMaxSteps: string;
  agentToolCallPrefix: string;
  agentToolErrorPrefix: string;

  // Local history: autosave and the history page
  autosaveStopped: string;
  /**
   * The editor's autosave status pill (lib/autosave-indicator.ts), shown while
   * there is an edit this browser has not taken yet. It disappears when one
   * lands, so it is the only sentence here about being saved -- there is no
   * matching "and it is saved" state to keep on screen.
   */
  autosaveWorking: string;
  historyChip: string;
  historyTitle: string;
  historyIntro: string;
  historyColDocument: string;
  historyColEdited: string;
  historyColSize: string;
  historyNotBackup: string;
  historySearchPlaceholder: string;
  historyEmptyTitle: string;
  historyEmpty: string;
  historyEmptySearchTitle: string;
  historyEmptySearch: string;
  historyClearSearch: string;
  historyOpen: string;
  historyDelete: string;
  historyCancel: string;
  historyDeleteTitle: string;
  historyClearTitle: string;
  /** `{title}` is the file name. */
  historyDeleteConfirm: string;
  historyClearAll: string;
  historyClearConfirm: string;
  historyUnsaved: string;
  /** `{size}` is a human-readable byte size. */
  historyUsage: string;
  /** `{count}` is the number of documents currently stored. */
  historyCount: string;
  /** `{page}` and `{pages}` are 1-based page numbers. */
  historyPageInfo: string;
  historyPrev: string;
  historyNext: string;
  historyBack: string;
  historyAutosaveLabel: string;
  /**
   * Shown in two places that answer the same question -- the switch's own help
   * text on /history, and the editor pill when autosave is off while the
   * document has edits in it. One sentence for both, so the warning in the
   * editor reads the way the page that owns the switch reads.
   */
  historyAutosaveOff: string;
  /** Why a document is still here: nothing deletes on a timer, only the user and
   *  the browser's storage limit do. */
  historyRetention: string;
  /** Row action: write this snapshot straight to disk, without opening it. */
  historyDownload: string;
  historyDownloadFailed: string;
  /** Toolbar filter: only the documents that were never exported to disk. */
  historyOnlyUnsaved: string;
  historyOpenFile: string;
  historyRailSettings: string;
  historyRailRetention: string;

  // /home -- the app's home page: the InSuite layout (New, open a file, your
  // saved documents read back out of this browser). Spanish and English are
  // written; the other five tables carry the English string until someone
  // translates them, which is what keeps the completeness check honest.
  homeNew: string;
  homeDocument: string;
  homeSpreadsheet: string;
  homePresentation: string;
  homePdf: string;
  homeChooseFile: string;
  homeDropHere: string;
  homeDropHint: string;
  homeSupports: string;
  homeRecent: string;
  homeRecentLoading: string;
  homeRecentEmpty: string;
  homeRecentEmptyHint: string;
  homeReopenTip: string;
  homeRemoveRecent: string;
  homeNavOpen: string;
  homeNavSaved: string;
  homeNavHelp: string;
  homeNavAbout: string;
  homeDropOverlay: string;
  homeDropOverlayHint: string;
  homeNoScript: string;
}
