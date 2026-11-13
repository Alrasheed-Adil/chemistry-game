/**
 * Internationalisation: English + Arabic (RTL).
 *
 * - `t('lobby.title', { code })` looks up UI strings with {placeholders}.
 * - `L(value)` picks the player's language from bilingual server content
 *   ({ en, ar }) and passes plain strings through.
 * - The language is per player (saved in localStorage) and sets
 *   <html lang dir>, so Tailwind's logical utilities (ms-, ps-, start-…) and
 *   the `rtl:` variant mirror the layout automatically.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Dictionaries                                                        */
/* ------------------------------------------------------------------ */

const en = {
  app: { name: 'chemistry', lab: 'Chemistry lab' },
  lang: { switchTo: 'العربية', switchLabel: 'Switch to Arabic' },

  landing: {
    title: 'A compatibility test for two people.',
    lead: 'Run four experiments with your partner. Finish with a lab report that measures how well you really know each other.',
    nameLabel: 'Your name',
    namePlaceholder: 'e.g. Sam',
    create: 'Start a session',
    or: 'Have a code?',
    codeLabel: 'Session code',
    join: 'Join',
    invited: 'You’re joining session {code}.',
    createOwn: 'Start your own session instead',
    experiments: 'The experiments',
    scale: 'How results are read',
    needName: 'Enter your name first.',
    codeLength: 'Session codes have 4 characters.',
  },

  tests: {
    sync: { name: 'Sync', desc: 'Answer a prompt, then predict what your partner said.' },
    telepathy: { name: 'Telepathy', desc: 'Without talking, pick the same well on the plate as your partner.' },
    decision: { name: 'Decision', desc: 'Choose what you’d do in a situation, and predict your partner’s choice.' },
    priority: { name: 'Priorities', desc: 'Rank four things from 1 to 4. Every item you both put in the same place scores.' },
  },

  header: {
    session: 'Session',
    copy: 'Copy invite link',
    copied: 'Invite link copied',
    leave: 'Leave',
    leaveConfirm: 'Leave this session?',
    host: 'Host',
    online: 'Connected',
    offline: 'Reconnecting…',
  },

  lobby: {
    title: 'Form your pairs',
    subtitle: 'Each pair is tested as one sample. Share the code {code} so others can join.',
    newPair: 'Start a pair',
    leavePair: 'Leave pair',
    empty: 'No pairs yet. Start one, then invite a partner.',
    openSeat: 'Open seat',
    joinSeat: 'Join',
    ready: 'Ready',
    you: 'you',
    unpaired: 'Not in a pair',
    allPaired: 'Everyone has a partner.',
    autoPair: 'Pair everyone randomly',
    hostTip: 'As host you can play in a pair, or stay out and run the session from a shared screen.',
    rename: 'Rename pair',
    renameHint: 'Leave empty to use the element name',
    manage: 'Manage {name}',
    moveTo: 'Move to {name}',
    moveNew: 'Move to a new pair',
    unpair: 'Remove from pair',
    kick: 'Remove from session',
    kickConfirm: 'Remove {name} from the session?',
    protocol: 'Test protocol',
    protocolReadonly: 'Set by the host',
    tests: 'Experiments',
    rounds: 'Rounds',
    timers: 'Time limits',
    seconds: '{n}s',
    scoring: 'Scoring: +1 for each correct prediction, +1 when you both give the same answer or choice, +2 for a Telepathy match, +1 for each item ranked in the same place.',
    start: 'Start testing',
    readyCount: 'Pairs ready: {n}',
    incomplete: 'Incomplete pairs will watch.',
    needPair: 'You need at least one complete pair to start.',
    waitingHost: 'Waiting for {name} to start the session.',
  },

  round: {
    count: 'Round {n} of {total}',
    categories: {
      know: 'About you',
      wave: 'Same wavelength',
      blank: 'Fill in the blank',
      decide: 'Situation',
      rank: 'Ranking',
    },
    progress: 'Locked in',
    spectating: 'You’re watching this round.',
    hosting: 'You’re hosting this round. Results appear when every pair locks in, or when you reveal them.',
    timeLeft: 'Time left',
    seconds: 'seconds',
  },

  sync: {
    yourAnswer: 'Your answer',
    answerPlaceholder: 'Answer honestly',
    predict: 'What will {name} answer?',
    predictPlaceholder: 'Your prediction',
    lock: 'Lock in',
    lockedTitle: 'Answer locked in',
    waitingFor: 'Waiting for {name}. No hints.',
    revealing: 'Revealing results…',
    change: 'Change answer',
    answer: 'Answer',
    prediction: 'Prediction for {name}',
    noAnswer: 'No answer',
    judgeTitle: 'You decide the close calls.',
    judgeBody: 'Tap ✓ or ✗ on any prediction to change its result. Inconclusive results score nothing until you accept them.',
    reviewing: 'The host is checking close calls.',
    jinxYes: 'Same answer: +{n}',
    jinxClose: 'Similar answers. Count them as the same?',
    jinxNo: 'Different answers',
    accept: 'Accept as a match',
    reject: 'Mark as no match',
  },

  outcome: { match: 'Match', close: 'Inconclusive', miss: 'No match', hostCall: 'Host decision' },

  decision: {
    you: 'What would you do?',
    partner: 'What will {name} choose?',
    lock: 'Lock in',
    lockedTitle: 'Choices locked in',
    chose: 'Chose',
    predicted: 'Predicted',
    same: 'Same choice: +{n}',
    different: 'Different choices',
    correct: 'Correct prediction',
    predictedBy: '{name} predicted this',
    choseBy: '{name} chose this',
  },

  priority: {
    instruction: 'Tap the items in order, starting with your top priority. Tap a placed item to take it back out.',
    rack: 'Your ranking',
    slot: 'Rank {n}',
    empty: 'Empty',
    top: 'Top priority',
    bottom: 'Lowest',
    reset: 'Start over',
    lock: 'Lock in',
    lockedTitle: 'Ranking locked in',
    rankLeft: 'Place {n} more',
    sameRanks: '{n} of {total} in the same place',
    rankOf: '{name}: rank {n}',
    noRanking: 'No ranking',
  },

  telepathy: {
    instruction: 'No talking or gestures. Pick the well you think your partner will pick.',
    pickWell: 'Pick a well',
    lock: 'Lock in',
    lockedWaiting: 'Locked in. Waiting for {name}.',
    you: 'You',
    locked: 'Locked',
    matchTitle: 'Signal received',
    matchBody: 'You both picked the same well. +{n}',
    missTitle: 'No signal',
    missBody: 'You picked different wells.',
  },

  host: {
    title: 'Host controls',
    progress: '{done} of {total} locked in',
    review: 'Check the results, then confirm',
    revealed: 'Results revealed',
    over: 'Session complete',
    swap: 'New prompt',
    reveal: 'Reveal now',
    next: 'Confirm and continue',
    final: 'Show lab report',
    end: 'End session',
    endConfirm: 'End the session now and show the lab report?',
    lobby: 'Back to lobby',
  },

  board: { title: 'Readings', points: '{n} pts' },

  report: {
    title: 'Lab report',
    cert: 'Certificate of chemistry',
    certified: 'Certified',
    session: 'Session {code}',
    index: 'Compatibility index',
    bond: 'Bond type',
    tie: 'Equal readings',
    ranking: 'All pairs',
    syncStat: 'Sync: {a} of {b} predictions',
    jinxStat: 'Same answers: {n}',
    telepathyStat: 'Telepathy: {a} of {b} matched',
    decisionStat: 'Decision: {a} of {b} predictions',
    priorityStat: 'Priorities: {a} of {b} ranks matched',
    supervised: 'Supervised by {name}',
    points: '{n} points',
    noRounds: 'No rounds were completed, so there’s nothing to report.',
    rematch: 'The host can start a new session from the lobby.',
    leave: 'Leave session',
    yourPair: 'Your pair',
  },

  bonds: {
    covalent: { name: 'Covalent bond', desc: 'You share almost everything.' },
    ionic: { name: 'Ionic bond', desc: 'A strong pull, even where you differ.' },
    hydrogen: { name: 'Hydrogen bond', desc: 'Steady, with room to grow.' },
    vdw: { name: 'Van der Waals forces', desc: 'A faint attraction. Keep experimenting.' },
    noble: { name: 'Noble gases', desc: 'No reaction yet.' },
  },

  errors: {
    host_only: 'Only the host can do that.',
    game_running: 'Pairs are locked while a session is running.',
    not_in_room: 'You’re not in this session. Join again with the code.',
    name_required: 'Enter your name first.',
    room_full: 'This session is full (24 players).',
    cannot_kick_self: 'You can’t remove yourself. Use Leave instead.',
    team_gone: 'That pair no longer exists.',
    team_full: 'That pair is already full.',
    rename_forbidden: 'Only members of this pair can rename it.',
    invalid_setting: 'That setting isn’t available.',
    need_one_test: 'Keep at least one experiment selected.',
    need_full_team: 'You need at least one complete pair to start.',
    nothing_to_swap: 'There’s no active round to change.',
    answers_closed: 'This round has closed.',
    spectating: 'You’re watching this round.',
    fill_both: 'Fill in your answer and your prediction.',
    pick_both: 'Choose an option for yourself and one for your partner.',
    rank_all: 'Place all four items before locking in.',
    nothing_to_verify: 'There are no results to check right now.',
    unknown_answer: 'That answer no longer exists.',
    invalid_verdict: 'Choose match or no match.',
    grid_closed: 'Picking has closed for this round.',
    already_locked: 'You’ve already locked in.',
    invalid_tile: 'Pick one of the wells.',
    pick_first: 'Pick a well first.',
    reveal_first: 'Reveal the results first.',
    not_started: 'The session hasn’t started.',
    room_not_found: 'No session found with that code. Check it and try again.',
    invalid_session: 'Your browser session is invalid. Refresh the page.',
    generic: 'Something went wrong on the server. Try again.',
    timeout: 'The server didn’t respond. Check your connection.',
    kicked: 'The host removed you from the session.',
    replaced: 'You opened this session in another tab.',
  },
};

const ar = {
  app: { name: 'كيمياء', lab: 'مختبر الكيمياء' },
  lang: { switchTo: 'English', switchLabel: 'التبديل إلى الإنجليزية' },

  landing: {
    title: 'اختبار توافق لشخصين.',
    lead: 'أجريا أربع تجارب معًا، واحصلا في النهاية على تقرير مختبر يقيس مدى معرفتكما ببعض.',
    nameLabel: 'اسمك',
    namePlaceholder: 'مثال: سارة',
    create: 'ابدأ جلسة',
    or: 'لديك رمز؟',
    codeLabel: 'رمز الجلسة',
    join: 'انضم',
    invited: 'ستنضم إلى الجلسة {code}.',
    createOwn: 'ابدأ جلسة خاصة بك بدلًا من ذلك',
    experiments: 'التجارب',
    scale: 'كيف تُقرأ النتائج',
    needName: 'اكتب اسمك أولًا.',
    codeLength: 'رمز الجلسة مكوّن من 4 خانات.',
  },

  tests: {
    sync: { name: 'تزامن', desc: 'أجب عن سؤال، ثم توقّع إجابة شريكك.' },
    telepathy: { name: 'توارد خواطر', desc: 'دون أي كلام، اختر نفس الخانة التي يختارها شريكك.' },
    decision: { name: 'قرار', desc: 'اختر ما ستفعله في موقف ما، وتوقّع اختيار شريكك.' },
    priority: { name: 'أولويات', desc: 'رتّب أربعة أشياء من 1 إلى 4. كل عنصر تضعانه في نفس المرتبة يُحتسب نقطة.' },
  },

  header: {
    session: 'جلسة',
    copy: 'نسخ رابط الدعوة',
    copied: 'تم نسخ رابط الدعوة',
    leave: 'مغادرة',
    leaveConfirm: 'هل تريد مغادرة الجلسة؟',
    host: 'المضيف',
    online: 'متصل',
    offline: 'جارٍ إعادة الاتصال…',
  },

  lobby: {
    title: 'كوّنوا الثنائيات',
    subtitle: 'كل ثنائي يُختبر كعيّنة واحدة. شارك الرمز {code} ليتمكن الآخرون من الانضمام.',
    newPair: 'ابدأ ثنائيًا',
    leavePair: 'غادر الثنائي',
    empty: 'لا توجد ثنائيات بعد. ابدأ ثنائيًا ثم ادعُ شريكًا.',
    openSeat: 'مقعد شاغر',
    joinSeat: 'انضم',
    ready: 'جاهز',
    you: 'أنت',
    unpaired: 'خارج الثنائيات',
    allPaired: 'الجميع لديه شريك.',
    autoPair: 'اقتران عشوائي للجميع',
    hostTip: 'بصفتك المضيف يمكنك اللعب ضمن ثنائي، أو البقاء خارج الثنائيات وإدارة الجلسة من شاشة مشتركة.',
    rename: 'إعادة تسمية الثنائي',
    renameHint: 'اتركه فارغًا لاستخدام اسم العنصر',
    manage: 'إدارة {name}',
    moveTo: 'نقل إلى {name}',
    moveNew: 'نقل إلى ثنائي جديد',
    unpair: 'إزالة من الثنائي',
    kick: 'إخراج من الجلسة',
    kickConfirm: 'هل تريد إخراج {name} من الجلسة؟',
    protocol: 'بروتوكول الاختبار',
    protocolReadonly: 'يحدده المضيف',
    tests: 'التجارب',
    rounds: 'الجولات',
    timers: 'المدة',
    seconds: '{n} ث',
    scoring: 'النقاط: +1 لكل توقّع صحيح، +1 عندما تتطابق إجابتاكما أو اختياراكما، +2 لتطابق توارد الخواطر، +1 لكل عنصر في نفس المرتبة.',
    start: 'ابدأ الاختبار',
    readyCount: 'الثنائيات الجاهزة: {n}',
    incomplete: 'الثنائيات غير المكتملة ستشاهد فقط.',
    needPair: 'تحتاج إلى ثنائي مكتمل واحد على الأقل للبدء.',
    waitingHost: 'بانتظار {name} لبدء الجلسة.',
  },

  round: {
    count: 'الجولة {n} من {total}',
    categories: {
      know: 'عنك',
      wave: 'نفس الموجة',
      blank: 'أكمل الفراغ',
      decide: 'موقف',
      rank: 'ترتيب',
    },
    progress: 'من أكّد',
    spectating: 'أنت تشاهد هذه الجولة.',
    hosting: 'أنت تدير هذه الجولة. تظهر النتائج عندما يؤكد الجميع، أو عندما تكشفها بنفسك.',
    timeLeft: 'الوقت المتبقي',
    seconds: 'ثانية',
  },

  sync: {
    yourAnswer: 'إجابتك',
    answerPlaceholder: 'أجب بصدق',
    predict: 'ما إجابة {name} برأيك؟',
    predictPlaceholder: 'توقّعك',
    lock: 'تأكيد',
    lockedTitle: 'تم تأكيد إجابتك',
    waitingFor: 'بانتظار {name}. بدون تلميحات.',
    revealing: 'جارٍ كشف النتائج…',
    change: 'تعديل الإجابة',
    answer: 'الإجابة',
    prediction: 'التوقّع لـ {name}',
    noAnswer: 'لا توجد إجابة',
    judgeTitle: 'أنت من يحسم الحالات المتقاربة.',
    judgeBody: 'اضغط ✓ أو ✗ على أي توقّع لتغيير نتيجته. النتائج غير الحاسمة لا تُحتسب حتى تقبلها.',
    reviewing: 'المضيف يراجع الحالات المتقاربة.',
    jinxYes: 'نفس الإجابة: +{n}',
    jinxClose: 'إجابتان متشابهتان. هل تُحتسبان متطابقتين؟',
    jinxNo: 'إجابتان مختلفتان',
    accept: 'قبول كتطابق',
    reject: 'اعتبارها غير متطابقة',
  },

  outcome: { match: 'تطابق', close: 'غير حاسم', miss: 'لا تطابق', hostCall: 'قرار المضيف' },

  decision: {
    you: 'ماذا ستفعل أنت؟',
    partner: 'ما اختيار {name} برأيك؟',
    lock: 'تأكيد',
    lockedTitle: 'تم تأكيد اختياراتك',
    chose: 'اختار',
    predicted: 'توقّع',
    same: 'نفس الاختيار: +{n}',
    different: 'اختياران مختلفان',
    correct: 'توقّع صحيح',
    predictedBy: 'توقّع {name} هذا الخيار',
    choseBy: 'اختار {name} هذا الخيار',
  },

  priority: {
    instruction: 'اضغط على العناصر بالترتيب، ابدأ بأولويتك الأولى. اضغط على عنصر موضوع لإعادته.',
    rack: 'ترتيبك',
    slot: 'المرتبة {n}',
    empty: 'فارغ',
    top: 'الأولوية الأولى',
    bottom: 'الأقل',
    reset: 'ابدأ من جديد',
    lock: 'تأكيد',
    lockedTitle: 'تم تأكيد ترتيبك',
    rankLeft: 'بقي {n}',
    sameRanks: '{n} من {total} في نفس المرتبة',
    rankOf: '{name}: المرتبة {n}',
    noRanking: 'لا يوجد ترتيب',
  },

  telepathy: {
    instruction: 'بدون كلام أو إشارات. اختر الخانة التي تظن أن شريكك سيختارها.',
    pickWell: 'اختر خانة',
    lock: 'تأكيد',
    lockedWaiting: 'تم التأكيد. بانتظار {name}.',
    you: 'أنت',
    locked: 'مؤكَّد',
    matchTitle: 'وصلت الإشارة',
    matchBody: 'اخترتما نفس الخانة. +{n}',
    missTitle: 'لا إشارة',
    missBody: 'اخترتما خانتين مختلفتين.',
  },

  host: {
    title: 'تحكم المضيف',
    progress: 'أكّد {done} من {total}',
    review: 'راجع النتائج ثم أكّد',
    revealed: 'تم كشف النتائج',
    over: 'انتهت الجلسة',
    swap: 'سؤال آخر',
    reveal: 'اكشف الآن',
    next: 'تأكيد ومتابعة',
    final: 'اعرض تقرير المختبر',
    end: 'إنهاء الجلسة',
    endConfirm: 'هل تريد إنهاء الجلسة الآن وعرض تقرير المختبر؟',
    lobby: 'العودة إلى غرفة الانتظار',
  },

  board: { title: 'القراءات', points: '{n} نقطة' },

  report: {
    title: 'تقرير المختبر',
    cert: 'شهادة كيمياء',
    certified: 'معتمد',
    session: 'الجلسة {code}',
    index: 'مؤشر التوافق',
    bond: 'نوع الرابطة',
    tie: 'قراءات متساوية',
    ranking: 'جميع الثنائيات',
    syncStat: 'تزامن: {a} من {b} توقعات',
    jinxStat: 'إجابات متطابقة: {n}',
    telepathyStat: 'توارد خواطر: تطابق {a} من {b}',
    decisionStat: 'قرار: {a} من {b} توقعات',
    priorityStat: 'أولويات: تطابق {a} من {b} مراتب',
    supervised: 'بإشراف {name}',
    points: '{n} نقطة',
    noRounds: 'لم تكتمل أي جولة، لذا لا يوجد ما يُكتب في التقرير.',
    rematch: 'يمكن للمضيف بدء جلسة جديدة من غرفة الانتظار.',
    leave: 'مغادرة الجلسة',
    yourPair: 'ثنائيك',
  },

  bonds: {
    covalent: { name: 'رابطة تساهمية', desc: 'تتشاركان كل شيء تقريبًا.' },
    ionic: { name: 'رابطة أيونية', desc: 'تجاذب قوي حتى حيث تختلفان.' },
    hydrogen: { name: 'رابطة هيدروجينية', desc: 'رابطة ثابتة ولديها مجال للنمو.' },
    vdw: { name: 'قوى فان دير فالس', desc: 'تجاذب خفيف. واصلا التجارب.' },
    noble: { name: 'غازات نبيلة', desc: 'لا يوجد تفاعل بعد.' },
  },

  errors: {
    host_only: 'هذا الإجراء للمضيف فقط.',
    game_running: 'لا يمكن تغيير الثنائيات أثناء الجلسة.',
    not_in_room: 'لست ضمن هذه الجلسة. انضم مجددًا باستخدام الرمز.',
    name_required: 'اكتب اسمك أولًا.',
    room_full: 'هذه الجلسة ممتلئة (24 لاعبًا).',
    cannot_kick_self: 'لا يمكنك إخراج نفسك. استخدم زر المغادرة.',
    team_gone: 'هذا الثنائي لم يعد موجودًا.',
    team_full: 'هذا الثنائي مكتمل بالفعل.',
    rename_forbidden: 'فقط أعضاء الثنائي يمكنهم تغيير اسمه.',
    invalid_setting: 'هذا الإعداد غير متاح.',
    need_one_test: 'اترك تجربة واحدة على الأقل مختارة.',
    need_full_team: 'تحتاج إلى ثنائي مكتمل واحد على الأقل للبدء.',
    nothing_to_swap: 'لا توجد جولة نشطة لتغييرها.',
    answers_closed: 'انتهت هذه الجولة.',
    spectating: 'أنت تشاهد هذه الجولة.',
    fill_both: 'اكتب إجابتك وتوقّعك.',
    pick_both: 'اختر خيارًا لنفسك وآخر لشريكك.',
    rank_all: 'رتّب العناصر الأربعة قبل التأكيد.',
    nothing_to_verify: 'لا توجد نتائج للمراجعة الآن.',
    unknown_answer: 'هذه الإجابة لم تعد موجودة.',
    invalid_verdict: 'اختر تطابق أو لا تطابق.',
    grid_closed: 'انتهى وقت الاختيار في هذه الجولة.',
    already_locked: 'لقد أكّدت اختيارك بالفعل.',
    invalid_tile: 'اختر إحدى الخانات.',
    pick_first: 'اختر خانة أولًا.',
    reveal_first: 'اكشف النتائج أولًا.',
    not_started: 'لم تبدأ الجلسة بعد.',
    room_not_found: 'لا توجد جلسة بهذا الرمز. تحقق منه وحاول مجددًا.',
    invalid_session: 'جلسة المتصفح غير صالحة. حدّث الصفحة.',
    generic: 'حدث خطأ في الخادم. حاول مرة أخرى.',
    timeout: 'الخادم لا يستجيب. تحقق من اتصالك.',
    kicked: 'أخرجك المضيف من الجلسة.',
    replaced: 'فتحت هذه الجلسة في تبويب آخر.',
  },
};

const DICTS = { en, ar };

/* ------------------------------------------------------------------ */
/* Elements: each pair is identified by one (flame-test colors)         */
/* ------------------------------------------------------------------ */

export const ELEMENTS = [
  { symbol: 'Na', number: 11, color: '#E39B00', name: { en: 'Sodium', ar: 'صوديوم' } },
  { symbol: 'Cu', number: 29, color: '#0E9688', name: { en: 'Copper', ar: 'نحاس' } },
  { symbol: 'Li', number: 3, color: '#D7263D', name: { en: 'Lithium', ar: 'ليثيوم' } },
  { symbol: 'K', number: 19, color: '#8A63D2', name: { en: 'Potassium', ar: 'بوتاسيوم' } },
  { symbol: 'Ba', number: 56, color: '#5E9E22', name: { en: 'Barium', ar: 'باريوم' } },
  { symbol: 'Ca', number: 20, color: '#E05A12', name: { en: 'Calcium', ar: 'كالسيوم' } },
  { symbol: 'Sr', number: 38, color: '#C2185B', name: { en: 'Strontium', ar: 'سترونشيوم' } },
  { symbol: 'Cs', number: 55, color: '#2F6FDE', name: { en: 'Cesium', ar: 'سيزيوم' } },
  { symbol: 'B', number: 5, color: '#2E9E5B', name: { en: 'Boron', ar: 'بورون' } },
  { symbol: 'Rb', number: 37, color: '#A8366B', name: { en: 'Rubidium', ar: 'روبيديوم' } },
  { symbol: 'In', number: 49, color: '#4656C8', name: { en: 'Indium', ar: 'إنديوم' } },
  { symbol: 'Mg', number: 12, color: '#6B7787', name: { en: 'Magnesium', ar: 'مغنيسيوم' } },
];

/** The three experiments, styled as element tiles. */
export const TEST_TILES = {
  sync: { symbol: 'Sy', number: 1 },
  telepathy: { symbol: 'Tp', number: 2 },
  decision: { symbol: 'Dc', number: 3 },
  priority: { symbol: 'Pr', number: 4 },
};

/** Compatibility % → bond classification. */
export function bondFor(pct) {
  if (pct >= 85) return 'covalent';
  if (pct >= 65) return 'ionic';
  if (pct >= 45) return 'hydrogen';
  if (pct >= 25) return 'vdw';
  return 'noble';
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

const LangContext = createContext(null);

function initialLang() {
  try {
    const saved = localStorage.getItem('chem:lang');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {
    /* storage blocked */
  }
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem('chem:lang', lang);
    } catch {
      /* ignore */
    }
  }, [lang, dir]);

  const t = useCallback(
    (key, vars) => {
      let value = lookup(DICTS[lang], key) ?? lookup(en, key) ?? key;
      if (typeof value === 'string' && vars) {
        value = value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
      }
      return value;
    },
    [lang],
  );

  /** Localise bilingual content ({ en, ar }) — plain strings pass through. */
  const L = useCallback((value) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value[lang] ?? value.en ?? '';
  }, [lang]);

  const setLang = useCallback((l) => setLangState(l === 'ar' ? 'ar' : 'en'), []);
  const toggle = useCallback(() => setLangState((l) => (l === 'ar' ? 'en' : 'ar')), []);

  const value = useMemo(() => ({ lang, dir, t, L, setLang, toggle, isRTL: dir === 'rtl' }), [lang, dir, t, L, setLang, toggle]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}

/** Display name for a pair: custom name, or its element's localized name. */
export function pairName(team, L) {
  if (!team) return '';
  return team.name || L(ELEMENTS[team.element % ELEMENTS.length].name);
}

export function elementOf(team) {
  return ELEMENTS[(team?.element ?? 0) % ELEMENTS.length];
}
