/**
 * i18n.js — Ava Judging System
 * ALL user-facing strings live here. No other JS file may contain user-visible text.
 *
 * Interpolation: STRINGS.key.replace('{placeholder}', value)
 * Multi-placeholder: use interpolate(STRINGS.key, { placeholder: value, ... })
 */

/**
 * Interpolates {placeholder} tokens in a string.
 * @param {string} template
 * @param {Record<string, string|number>} values
 * @returns {string}
 */
export function interpolate(template, values) {
  return Object.entries(values).reduce(
    (str, [key, val]) => str.replaceAll(`{${key}}`, String(val)),
    template
  );
}

export const STRINGS = {

  // ============================================================
  // APP META
  // ============================================================
  app: {
    name:        'Ava Judging System',
    tagline:     'Free, open-source QR-based judging for academic research presentations',
    version:     'Version {version}',
    poweredBy:   'Powered by Ava Judging System',
    loading:     'Loading…',
    saving:      'Saving…',
    submitting:  'Submitting…',
    generating:  'Generating…',
    syncing:     'Syncing…',
    please_wait: 'Please wait…',
  },

  // ============================================================
  // ERRORS
  // ============================================================
  errors: {
    generic:           'Something went wrong. Please try again.',
    network:           'Network error. Please check your connection and try again.',
    networkOffline:    'Network error. Your vote has been saved and will sync when connected.',
    timeout:           'The request timed out. Please try again.',
    serverError:       'Server error. Please try again in a moment.',
    notConfigured:     'The system is not configured. Please contact the event administrator.',
    notFound:          '{item} not found.',
    accessDenied:      'Access denied. You do not have permission to perform this action.',

    // Score validation
    invalidScore:      'Score must be between {min} and {max}.',
    invalidScoreDecimal: 'Score may have at most {places} decimal places.',
    scoreRequired:     'Please enter a score for {category}.',
    allScoresRequired: 'Please fill in all rubric scores before submitting.',
    invalidScoreNumber: 'Score must be a valid number.',

    // Vote errors
    duplicateVote:     'You have already scored this presenter.',
    duplicateAudienceVote: 'You have already submitted a vote for this presenter.',
    selfVote:          'You cannot vote for yourself.',
    votingClosed:      'Voting is currently closed.',
    votingPaused:      'Voting is currently paused. Please wait for the event administrator to resume.',
    presenterNotFound: 'Presenter not found. Please check the ID and try again.',
    presenterInactive: 'This presenter is not active. Please contact the event administrator.',
    trackRestricted:   'You are not assigned to score presenters in this track.',
    alreadyScored:     'You have already submitted scores for this presenter.',

    // Auth errors
    tokenExpired:      'Your session has expired. Please use your original invitation link or request a new one.',
    tokenInvalid:      'Invalid session. Please use your original invitation link or contact the event administrator.',
    tokenMissing:      'No session token found. Please use your invitation link to log in.',
    adminAuthRequired: 'Administrator authentication required.',
    adminSessionExpired: 'Your admin session has expired. Please log in again.',
    adminInvalidPassword: 'Incorrect password. Please try again.',
    adminLockedOut:    'Too many failed attempts. Please wait {minutes} minute(s) before trying again.',
    adminAttemptsRemaining: '{remaining} attempt(s) remaining.',

    // Form errors
    required:          'This field is required.',
    requiredField:     '{field} is required.',
    invalidEmail:      'Please enter a valid email address.',
    invalidDate:       'Please enter a valid date.',
    invalidURL:        'Please enter a valid URL.',
    weightsMustSum100: 'Judge weight and audience weight must add up to 100%.',
    nameTooShort:      '{field} must be at least {min} characters.',
    nameTooLong:       '{field} must be no more than {max} characters.',
    invalidCSV:        'The CSV file could not be parsed. Please check the format and try again.',
    csvRowError:       'Row {row}: {error}',
    csvNoData:         'The CSV file appears to be empty.',
    duplicateEmail:    'A judge with this email address already exists.',
    duplicateID:       'A presenter with this ID already exists.',

    // Export errors
    exportFailed:      'Export failed. Please try again.',
    pdfFailed:         'PDF generation failed. Please try again.',
    zipFailed:         'ZIP generation failed. Please try again.',
    noDataToExport:    'There is no data to export yet.',

    // Connection test
    connectionFailed:  'Could not connect to the backend. Please check the Script URL and try again.',
    connectionInvalid: 'The Script URL does not appear to be a valid Google Apps Script URL.',
  },

  // ============================================================
  // SUCCESS MESSAGES
  // ============================================================
  success: {
    voteSubmitted:       'Score submitted successfully!',
    voteSubmittedOffline: 'Score saved offline. It will sync when you reconnect.',
    syncComplete:        '{count} offline vote(s) synced successfully.',
    syncPartial:         '{synced} of {total} offline votes synced. {failed} failed and will retry.',
    settingsSaved:       'Settings saved successfully.',
    eventCreated:        'Event created successfully.',
    presenterAdded:      'Presenter added successfully.',
    presenterUpdated:    'Presenter updated successfully.',
    presenterDeleted:    'Presenter deleted.',
    presentersImported:  '{count} presenter(s) imported successfully.',
    judgeAdded:          'Judge added successfully.',
    judgeUpdated:        'Judge updated successfully.',
    judgeDeleted:        'Judge removed.',
    judgeInvited:        'Invitation sent to {email}.',
    bulkInvitesSent:     'Invitations sent to {count} judge(s).',
    inviteResent:        'Invitation resent to {name}.',
    reminderSent:        'Reminder sent to {name}.',
    bulkRemindersSent:   'Reminders sent to {count} judge(s).',
    trackAdded:          'Track added successfully.',
    trackUpdated:        'Track updated successfully.',
    trackDeleted:        'Track deleted.',
    checkInMarked:       '{name} checked in.',
    bulkCheckIn:         '{count} presenter(s) checked in.',
    markedAbsent:        '{name} marked as absent.',
    templateSaved:       'Template "{name}" saved.',
    templateLoaded:      'Template "{name}" loaded. Review settings before saving.',
    templateDeleted:     'Template deleted.',
    exportReady:         'Export ready. Download starting…',
    voteCopied:          'Vote deleted successfully.',
    passwordChanged:     'Password updated successfully.',
    connectionOK:        'Successfully connected to the backend.',
    resultsRefreshed:    'Results refreshed.',
    votingOpened:        'Voting is now OPEN.',
    votingPaused:        'Voting is now PAUSED.',
    votingClosed:        'Voting is now CLOSED.',
    copiedToClipboard:   'Copied to clipboard.',
    presenterAssigned:   '{count} presenter(s) assigned to {name}.',
  },

  // ============================================================
  // CONFIRMATION DIALOGS
  // ============================================================
  confirm: {
    deletePresenter:   'Delete {name}? This cannot be undone. Their votes will remain in the system.',
    deleteJudge:       'Remove {name} as a judge? Their scores will remain in the system.',
    deleteTrack:       'Delete the "{name}" track? Presenters in this track will become untracked.',
    deleteTemplate:    'Delete the "{name}" template? This cannot be undone.',
    deleteVote:        'Delete this vote? This will affect the presenter\'s score and cannot be undone.',
    closeVoting:       'Close voting? This will prevent further submissions. You can re-open it if needed.',
    pauseVoting:       'Pause voting? Judges will see a "voting paused" message and cannot submit scores.',
    loadTemplate:      'Load the "{name}" template? This will overwrite your current scoring configuration.',
    bulkDelete:        'Delete {count} selected item(s)? This cannot be undone.',
    sendBulkInvites:   'Send invitations to {count} judge(s)?',
    sendBulkReminders: 'Send reminders to {count} incomplete judge(s)?',
    importCSV:         'Import {count} presenter(s)? Existing data will not be overwritten.',
    resetEvent:        'Reset this event? ALL data including votes, scores, and presenters will be permanently deleted. This cannot be undone.',
    exportSensitive:   'This export contains judge scores. Only share with authorized personnel.',
  },

  // ============================================================
  // LABELS (form fields, column headers, data labels)
  // ============================================================
  labels: {
    // Common
    id:              'ID',
    name:            'Name',
    email:           'Email',
    department:      'Department',
    track:           'Track',
    status:          'Status',
    actions:         'Actions',
    date:            'Date',
    time:            'Time',
    score:           'Score',
    scores:          'Scores',
    rank:            'Rank',
    notes:           'Notes',
    description:     'Description',
    color:           'Color',
    active:          'Active',
    created:         'Created',
    updated:         'Updated',

    // Presenter fields
    presenterName:   'Presenter Name',
    posterNumber:    'Poster Number',
    presenterID:     'Presenter ID',
    checkedIn:       'Checked In',
    checkInTime:     'Check-In Time',

    // Judge fields
    judgeName:       'Judge Name',
    judgeEmail:      'Judge Email',
    judgeID:         'Judge ID',
    token:           'Access Token',
    tokenStatus:     'Token Status',
    tokenExpiry:     'Token Expiry',
    lastActivity:    'Last Activity',
    assignedTrack:   'Assigned Track',
    assignedPresenters: 'Assigned Presenters',
    inviteStatus:    'Invite Status',
    loginStatus:     'Login Status',

    // Event settings
    eventName:       'Event Name',
    eventDate:       'Event Date',
    eventDescription: 'Event Description',
    scriptURL:       'Script URL',
    scoringMode:     'Scoring Mode',
    rubricMode:      'Score Type',
    judgeWeight:     'Judge Weight (%)',
    audienceWeight:  'Audience Weight (%)',
    maxJudgeScore:   'Max Judge Score',
    maxAudienceScore: 'Max Audience Score',
    allowDecimals:   'Allow Decimal Scores',
    tracksEnabled:   'Enable Tracks',
    tiebreakerRule:  'Tiebreaker Rule',
    publicLeaderboard: 'Public Leaderboard',
    selfVotePrevention: 'Self-Vote Prevention',
    audienceVotingEnabled: 'Enable Audience Voting',
    multiDayEvent:   'Multi-Day Event',
    currentDay:      'Current Day',
    adminPassword:   'Admin Password',
    adminEmail:      'Admin Email',

    // Rubric
    rubricCategory:      'Category Name',
    rubricDescription:   'Category Description',
    rubricMaxScore:      'Max Points',
    rubricWeight:        'Weight',
    rubricAllowComments: 'Allow Judge Comments',
    comment:             'Comment (optional)',
    commentRequired:     'Comment',

    // Results
    judgeAvg:        'Judge Avg',
    audienceAvg:     'Audience Avg',
    finalScore:      'Final Score',
    judgeVotes:      'Judge Votes',
    audienceVotes:   'Audience Votes',
    overallRank:     'Overall Rank',
    trackRank:       'Track Rank',
    completion:      'Completion',
    progress:        'Progress',

    // Voter fields (audience)
    studentID:       'Student ID',
    voterName:       'Your Name',
    voterID:         'Your Student ID',

    // Template
    templateName:    'Template Name',
    templateDesc:    'Description',

    // Misc
    password:        'Password',
    confirmPassword: 'Confirm Password',
    allTracks:       'All Tracks',
    allPresenters:   'All Presenters',
    allJudges:       'All Judges',
    noTrack:         'No Track',
    selectTrack:     '— Select Track —',
    searchPlaceholder: 'Search…',
    filterBy:        'Filter by',
    sortBy:          'Sort by',
    perPage:         'per page',
    showing:         'Showing {from}–{to} of {total}',
    selected:        '{count} selected',
    page:            'Page {page} of {total}',
  },

  // ============================================================
  // HEADINGS
  // ============================================================
  headings: {
    // Auth
    adminLogin:       'Admin Login',
    judgeWelcome:     'Welcome, {name}',
    judgeWelcomeBack: 'Welcome back, {name}',
    setupWizard:      'Competition Setup',

    // Wizard steps
    step1EventBasics: 'Event Basics',
    step2Scoring:     'Scoring Configuration',
    step3Options:     'Competition Options',
    step4Admin:       'Admin Settings',
    step5Review:      'Review & Create',

    // Admin pages
    adminDashboard:   'Live Event Dashboard',
    managePresenter:  'Manage Presenters',
    manageJudges:     'Manage Judges',
    manageTracks:     'Manage Tracks',
    qrManager:        'QR Code Manager',
    checkIn:          'Presenter Check-In',
    judgeProgress:    'Judge Progress',
    liveResults:      'Live Results',
    reports:          'Reports & Analytics',
    templates:        'Event Templates',

    // Reports
    judgeQualityReport:   'Judge Quality Report',
    competitorScorecard:  'Competitor Scorecard',
    eventSummary:         'Event Summary',
    liveLeaderboard:      'Live Leaderboard',

    // Judge pages
    judgeDashboard:   'My Assignments',
    scorePresenter:   'Score Presenter',
    enterPresenterID: 'Enter Presenter ID',

    // Public pages
    audienceVote:     'Vote for a Presenter',
    publicLeaderboard: 'Live Leaderboard',
    presentationDetails: 'Presentation Details',

    // Modals
    addPresenter:     'Add Presenter',
    editPresenter:    'Edit Presenter',
    addJudge:         'Add Judge',
    editJudge:        'Edit Judge',
    addTrack:         'Add Track',
    editTrack:        'Edit Track',
    assignPresenters: 'Assign Presenters to {name}',
    confirmAction:    'Confirm Action',
    importCSV:        'Import from CSV',
    previewQR:        'QR Code — {name}',
    saveTemplate:     'Save as Template',
    loadTemplate:     'Load Template',
    deleteConfirm:    'Confirm Delete',
    exportOptions:    'Export Options',
    viewScores:       'Scores for {name}',
    testConnection:   'Test Backend Connection',
    connectionResult: 'Connection Result',
  },

  // ============================================================
  // BUTTON TEXT
  // ============================================================
  buttons: {
    // Common
    save:           'Save',
    cancel:         'Cancel',
    delete:         'Delete',
    edit:           'Edit',
    add:            'Add',
    close:          'Close',
    confirm:        'Confirm',
    continue:       'Continue',
    back:           'Back',
    next:           'Next',
    finish:         'Finish',
    submit:         'Submit',
    search:         'Search',
    filter:         'Filter',
    reset:          'Reset',
    clear:          'Clear',
    refresh:        'Refresh',
    retry:          'Try Again',
    copy:           'Copy',
    preview:        'Preview',
    download:       'Download',
    print:          'Print',
    export:         'Export',
    import:         'Import',
    generate:       'Generate',
    apply:          'Apply',
    view:           'View',
    viewAll:        'View All',
    manage:         'Manage',
    assign:         'Assign',
    selectAll:      'Select All',
    deselectAll:    'Deselect All',
    uploadFile:     'Upload File',
    downloadTemplate: 'Download Template',

    // Auth
    login:          'Log In',
    logout:         'Log Out',
    goToDashboard:  'Go to Dashboard',

    // Voting controls
    openVoting:     'Open Voting',
    pauseVoting:    'Pause Voting',
    closeVoting:    'Close Voting',
    refreshResults: 'Refresh Results',
    autoRefreshOn:  'Auto-Refresh: On',
    autoRefreshOff: 'Auto-Refresh: Off',

    // Judge actions
    scanQR:            'Scan QR Code',
    loadPresenter:     'Load Presenter',
    submitScores:      'Submit Scores',
    submitScoresOffline: 'Save Offline',
    nextPresenter:     'Next Presenter',
    backToDashboard:   'Back to Dashboard',
    skipToNext:        'Skip — Score Later',

    // Presenter management
    addPresenter:      'Add Presenter',
    importPresenters:  'Import CSV',
    exportPresenters:  'Export CSV',
    downloadCSVTemplate: 'Download CSV Template',
    checkIn:           'Check In',
    markAbsent:        'Mark Absent',
    bulkCheckIn:       'Bulk Check-In',

    // Judge management
    addJudge:          'Add Judge',
    importJudges:      'Import CSV',
    sendInvite:        'Send Invite',
    resendInvite:      'Resend Invite',
    sendAllInvites:    'Send All Invites',
    sendReminder:      'Send Reminder',
    sendAllReminders:  'Send Reminders to Incomplete',
    assignPresenters:  'Assign Presenters',
    viewScores:        'View Scores',

    // Export / Reports
    exportCSV:         'Export CSV',
    exportExcel:       'Export Excel',
    exportPDF:         'Export PDF',
    downloadAllQR:     'Download All QR (ZIP)',
    printQRPDF:        'Print QR PDF',
    downloadPNG:       'Download PNG',
    generateReport:    'Generate Report',
    emailScorecard:    'Email Scorecard',
    generateAllScorecards: 'Generate All Scorecards',
    emailAllScorecards: 'Email All Presenters',
    fullScreen:        'Full Screen',
    exitFullScreen:    'Exit Full Screen',

    // Connection test
    testConnection:    'Test Connection',
    saveScriptURL:     'Save & Test Connection',

    // Template
    saveAsTemplate:    'Save as Template',
    loadTemplate:      'Load This Template',
    exportTemplateJSON: 'Export as JSON',
    importTemplateJSON: 'Import JSON',

    // Accessibility
    toggleHighContrast: 'High Contrast',
    toggleLargeText:    'Large Text',

    // Sync
    syncNow:    'Sync Now ({count} pending)',
    dismissBanner: 'Dismiss',
  },

  // ============================================================
  // STATUS & STATE MESSAGES
  // ============================================================
  status: {
    votingOpen:   'Voting is OPEN',
    votingPaused: 'Voting is PAUSED',
    votingClosed: 'Voting is CLOSED',

    online:       'Online',
    offline:      'Offline — {count} vote(s) pending sync',
    syncing:      'Syncing {count} vote(s)…',
    syncDone:     'All votes synced',

    judgeNotInvited: 'Not Invited',
    judgeInvited:    'Invited',
    judgeLoggedIn:   'Logged In',
    judgeActive:     'Active',
    judgeInactive:   'Inactive',
    judgeComplete:   'Complete',

    scored:    'Scored',
    notScored: 'Not Scored',
    checkedIn: 'Checked In',
    absent:    'Absent',
    notPresent: 'Not Arrived',

    tokenValid:   'Token Valid',
    tokenExpired: 'Token Expired',
    tokenUsed:    'Token Used',

    calculating: 'Calculating…',
    noResults:   'No results yet',
    noVotes:     'No votes recorded yet',
    noJudges:    'No judges added yet',
    noPresenters: 'No presenters added yet',
    noTracks:    'No tracks created yet',
    noTemplates: 'No templates saved yet',

    progressOf:       '{done} of {total} scored',
    progressPercent:  '{percent}% complete',
    allComplete:      'All assignments complete!',
    inactiveAlert:    '{name} has been inactive for over {minutes} minutes.',

    lastSeen:         'Last seen {time}',
    lastActivity:     '{time} ago',
    justNow:          'just now',
    minutesAgo:       '{n} min ago',
    hoursAgo:         '{n}h ago',

    rankOf:           '#{rank} of {total}',
    trackRankOf:      '#{rank} of {total} in {track}',

    resultsPublic:    'Results are live',
    resultsHidden:    'Results will be announced at the ceremony',
  },

  // ============================================================
  // JUDGE PORTAL STRINGS
  // ============================================================
  judge: {
    welcomeTitle:      'You\'re in!',
    welcomeMessage:    'Welcome, {name}. You\'re ready to start judging.',
    welcomeRedirect:   'Redirecting to your dashboard in {seconds} second(s)…',
    expiredTitle:      'Session Expired',
    expiredMessage:    'Your judging link has expired. Please contact the event administrator to request a new invitation.',
    invalidTitle:      'Invalid Link',
    invalidMessage:    'This judging link is not valid. Please use the link from your invitation email or contact the event administrator.',
    noTokenTitle:      'No Link Detected',
    noTokenMessage:    'Please open the invitation link from your email to access the judging portal.',

    dashboardSubtitle: 'Event: {eventName}',
    assignedCount:     'You are assigned to score {total} presenter(s).',
    completedCount:    'You have scored {done} of {total} presenter(s).',
    allDone:           'You have scored all your assigned presenters. Thank you!',
    notStarted:        'You have not scored any presenters yet.',
    showUnscored:      'Show Unscored Only',
    showAll:           'Show All',
    scanInstruction:   'Scan a presenter\'s QR code or enter their ID below.',

    presenterInfo:     'Scoring: {name}',
    posterNum:         'Poster #{number}',
    scoreInstructions: 'Rate each category from 0 to {max}.',
    singleScoreInst:   'Enter a score from 0 to {max}.',
    runningTotal:      'Running Total: {score} / {max}',
    submitConfirm:     'Submit scores for {name}?',

    successTitle:      'Scores Submitted!',
    successMessage:    'You have successfully scored {name}.',
    offlineTitle:      'Saved Offline',
    offlineMessage:    'No internet connection detected. Your score for {name} has been saved and will sync automatically when you reconnect.',
    pendingCount:      '{count} vote(s) waiting to sync',
  },

  // ============================================================
  // AUDIENCE VOTING STRINGS
  // ============================================================
  audience: {
    pageTitle:         'Vote for {name}',
    intro:             'You are voting for:',
    identityHeading:   'Your Identity',
    identityNote:      'Your Student ID is only used to prevent duplicate votes. It is not stored with your score.',
    votingClosed:      'Voting is currently closed.',
    votingPaused:      'Voting is temporarily paused. Please check back soon.',
    successTitle:      'Vote Submitted!',
    successMessage:    'Thank you for voting for {name}.',
    voteAnother:       'To vote for another presenter, scan their QR code.',
    alreadyVoted:      'You have already voted for this presenter.',
    selfVoteBlocked:   'You cannot vote for your own presentation.',
  },

  // ============================================================
  // ADMIN STRINGS
  // ============================================================
  admin: {
    loginTitle:        'Admin Login',
    loginSubtitle:     'Ava Judging System — Event Administrator',
    passwordPlaceholder: 'Enter admin password',
    firstTimeLink:     'First time? Set up your Script URL',
    sessionExpired:    'Your admin session has expired. Please log in again.',

    setupComplete:     'Event created! You can now add presenters and judges.',
    noEvents:          'No event configured. Use the setup wizard to create one.',
    editingEvent:      'Editing: {eventName}',

    votingStatusBig: {
      open:   'VOTING OPEN',
      paused: 'VOTING PAUSED',
      closed: 'VOTING CLOSED',
    },

    statPresenters:   'Presenters',
    statJudges:       'Judges',
    statVotes:        'Total Votes',
    statCompletion:   'Completion',
    statLeading:      'Leading',

    recentVotesTitle: 'Recent Votes',
    alertsTitle:      'Alerts',
    noAlerts:         'No alerts at this time.',
    quickActions:     'Quick Actions',

    csvImportPreview:   'Preview — {count} rows found',
    csvImportErrors:    '{count} row(s) have errors and will be skipped.',
    csvImportReady:     'Ready to import {count} presenter(s).',
    csvInvalidHeader:   'CSV is missing required column: {column}',

    rubricBuilder:      'Rubric Builder',
    addRubricCategory:  'Add Category',
    removeCategory:     'Remove',
    previewScore:       'Total possible score: {max} points',
    weightSum:          'Total weight: {sum}',
    weightSumOK:        'Weights are balanced.',

    connectionTest:     'Testing connection to your Google Apps Script…',
    connectionSuccess:  'Connected! Event name: {eventName}',
    connectionFailed:   'Connection failed. Check the URL and try again.',

    trackColorPicker:   'Pick a color for this track',
    noTrackAssigned:    'No Track Assigned',

    judgeAssignAll:     'Assign all presenters (no restriction)',
    judgeAssignTrack:   'Assign all presenters in a track',
    judgeAssignManual:  'Manually select presenters',

    progressAlertsTitle:   'Inactive Judges',
    noInactiveJudges:      'All judges have been active recently.',
    missingEvaluations:    'Missing Evaluations',
    noMissingEvaluations:  'All judges have completed their assignments.',

    reportInterRaterLabel: 'Inter-Rater Reliability',
    reportInterRaterPoor:  'Poor — Consider calibration session',
    reportInterRaterFair:  'Fair — Some inconsistency between judges',
    reportInterRaterGood:  'Good — Reasonable agreement between judges',
    reportInterRaterExcellent: 'Excellent — Strong agreement between judges',
    reportOutlierFlag:     '⚠ Outlier — Mean score differs from group by >{sd}x SD',

    scorecardStrengths:    'Strengths',
    scorecardGrowth:       'Areas for Growth',
    scorecardAboveAvg:     'Scored above event average',
    scorecardBelowAvg:     'Scored below event average',
    scorecardPercentile:   '{percentile}th percentile',
    scorecardNoComments:   'No written comments were provided.',
    scorecardAnonymNote:   'Judge comments are anonymized to protect reviewer identity.',

    qrCardsPerPage:     'Cards per page',
    qrPageSize:         'Page size',
    qrFilterTrack:      'Filter by track',
    qrPrintAll:         'All Presenters',
    qrPrintSelected:    'Selected Only',
    qrJudgeSection:     'Judge Login QR Codes',
    qrJudgeSectionNote: 'These QR codes link directly to each judge\'s login. Share with judges who prefer to scan instead of clicking the email link.',
  },

  // ============================================================
  // REPORTS STRINGS
  // ============================================================
  reports: {
    judgeQualityTitle:    'Judge Quality Report',
    judgeQualitySubtitle: 'Statistical analysis of judge scoring behavior',
    noReportData:         'Not enough data to generate this report. At least 2 judges and 5 votes are required.',
    judgeSection:         'Judge Statistics',
    irrSection:           'Inter-Rater Reliability',
    correlationMatrix:    'Pairwise Judge Correlation',
    outlierSection:       'Outlier Flags',
    histogramTitle:       'Score Distribution — {name}',
    perRubricTitle:       'Per-Rubric Statistics — {name}',
    meanScore:            'Mean Score',
    stdDev:               'Std Dev',
    responseTime:         'Avg. Response Time',
    consistencyScore:     'Consistency Score',
    totalScored:          'Presenters Scored',

    scorecardTitle:       'Competitor Scorecard — {name}',
    scorecardEvent:       'Event: {event}',
    scorecardDate:        'Date: {date}',
    scorecardOverall:     'Overall Score',
    scorecardRank:        'Overall Rank',
    scorecardTrackRank:   'Track Rank',
    scorecardBreakdown:   'Score Breakdown',
    scorecardComments:    'Judge Feedback',
    scorecardRadar:       'Performance Radar',
    scorecardVsAvg:       'Your score vs. event average',

    eventSummaryTitle:    'Event Summary Report',
    eventOverview:        'Event Overview',
    topPresenters:        'Top 10 Presenters',
    trackWinners:         'Track Winners',
    rubricAnalysis:       'Rubric Difficulty Analysis',
    judgeParticipation:   'Judge Participation',
    votingTimeline:       'Voting Activity Timeline',
    audienceJudgeCorr:    'Audience vs. Judge Score Correlation',
    hardestRubric:        'Hardest rubric (lowest avg): {name}',
    easiestRubric:        'Easiest rubric (highest avg): {name}',
    dataQualityNotes:     'Data Quality Notes',
    lowParticipationJudge: '{name} scored only {count} of {total} presenters ({pct}%).',

    winnerReportTitle:    'Winners — {eventName}',
    winnerReportDate:     '{date}',
    overallWinner:        'Overall Winner',
    trackWinner:          '{track} Winner',
    place1:               '1st Place',
    place2:               '2nd Place',
    place3:               '3rd Place',
    generatedOn:          'Generated on {date}',
  },

  // ============================================================
  // EMAIL TEMPLATE STRINGS (used in Email.gs rendered via template literals)
  // ============================================================
  email: {
    magicLinkSubject:   'Your judging link for {eventName}',
    magicLinkHeading:   'You\'re invited to judge',
    magicLinkBody:      'Hi {name}, you have been invited to judge {eventName}. Click the button below to access your judging portal.',
    magicLinkButton:    'Access My Judging Portal',
    magicLinkExpiry:    'This link expires in 24 hours.',
    magicLinkNote:      'If you did not expect this email, please ignore it.',

    reminderSubject:    'Reminder: {remaining} presenter(s) remaining — {eventName}',
    reminderHeading:    'You have presentations to score',
    reminderBody:       'Hi {name}, you have scored {done} of {total} assigned presenter(s). You have {remaining} remaining.',
    reminderButton:     'Continue Judging',

    scorecardSubject:   'Your scorecard from {eventName}',
    scorecardHeading:   'Your Research Presentation Results',
    scorecardBody:      'Hi {name}, the results from {eventName} are now available. Your scorecard is attached.',
    scorecardButton:    'View Scorecard',

    adminAlertInactiveSubject: 'Alert: {name} has been inactive for {minutes} minutes — {eventName}',
    adminAlertCompleteSubject: 'All judges have completed — {eventName}',
    adminAlertCompleteBody:    'All {count} judges have finished scoring. You can now close voting and generate results.',

    emailFooter:        'Sent by Ava Judging System · {eventName} · {date}',
    emailUnsubscribe:   'This is an event notification. You were added as a judge by the event administrator.',
  },

  // ============================================================
  // ACCESSIBILITY
  // ============================================================
  a11y: {
    closeModal:         'Close dialog',
    openMenu:           'Open menu',
    closeMenu:          'Close menu',
    sortAscending:      'Sort ascending',
    sortDescending:     'Sort descending',
    removeTag:          'Remove {name}',
    togglePassword:     'Show/hide password',
    expandRow:          'Expand row details',
    collapseRow:        'Collapse row details',
    loadingContent:     'Loading content…',
    qrCodeAlt:          'QR code for {name} — ID {id}',
    logoAlt:            'Ava Judging System',
    rankMedal1:         'Gold — 1st place',
    rankMedal2:         'Silver — 2nd place',
    rankMedal3:         'Bronze — 3rd place',
    offlineBanner:      'You are offline. {count} vote(s) are saved and will sync when reconnected.',
    votingOpenBanner:   'Voting is currently open.',
    votingPausedBanner: 'Voting is currently paused.',
    votingClosedBanner: 'Voting is currently closed.',
    scoreSlider:        'Score for {category}: {score} out of {max}',
    progressBar:        '{percent}% complete — {done} of {total} scored',
    sidebarNav:         'Admin navigation',
    skipToMain:         'Skip to main content',
    pageTitle:          '{page} — Ava Judging System',
    required:           'required',
    optional:           'optional',
    currentPage:        'Current page',
    previousPage:       'Previous page',
    nextPage:           'Next page',
    toggleSidebar:      'Toggle sidebar navigation',
    inactiveJudge:      '{name} has been inactive and may need a reminder.',
  },
};
