/**
 * Game content — every player-facing string is bilingual: { en, ar }.
 * The client renders whichever language each player has chosen, so a mixed
 * Arabic/English group sees the same prompt in their own language.
 */

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Draw an unused index from `list`, tracking used ones in `used` (resets when exhausted). */
function drawIndex(list, used) {
  if (used.size >= list.length) used.clear();
  const available = list.map((_, i) => i).filter((i) => !used.has(i));
  const index = pick(available);
  used.add(index);
  return index;
}

/* ------------------------------------------------------------------ */
/* Sync — answer for yourself, predict your partner                    */
/* category keys are translated on the client: know | wave | blank     */
/* ------------------------------------------------------------------ */

const S = (category, en, ar) => ({ category, text: { en, ar } });

export const SYNC_PROMPTS = [
  S('know', "What's your ultimate comfort food?", 'ما الأكلة التي تريّحك مهما كان مزاجك؟'),
  S('know', 'Your go-to song to sing out loud?', 'أغنيتك المفضّلة للغناء بصوت عالٍ؟'),
  S('know', 'Dream vacation destination?', 'وجهة إجازة أحلامك؟'),
  S('know', "What's your most-used emoji?", 'ما أكثر إيموجي تستخدمه؟'),
  S('know', 'Which famous person would you want to have dinner with?', 'أي شخصية مشهورة تتمنى أن تتناول العشاء معها؟'),
  S('know', "First thing you'd buy with a surprise million?", 'أول شيء ستشتريه لو حصلت على مليون فجأة؟'),
  S('know', 'What annoys you the most?', 'ما أكثر شيء يستفزّك؟'),
  S('know', 'What would your autobiography be called?', 'ما عنوان سيرتك الذاتية لو كتبتها؟'),
  S('know', 'Your perfect day off?', 'يوم الإجازة المثالي بالنسبة لك؟'),
  S('know', "What's your most irrational fear?", 'ما أغرب شيء تخاف منه؟'),
  S('know', 'If you were an animal, which one would you be?', 'لو كنت حيوانًا، ماذا ستكون؟'),
  S('know', 'Your favorite pizza topping?', 'إضافتك المفضّلة على البيتزا؟'),
  S('know', 'A smell that instantly makes you happy?', 'رائحة تسعدك فورًا؟'),
  S('know', 'All-time favorite movie?', 'فيلمك المفضّل على الإطلاق؟'),
  S('know', 'Which superpower would you pick?', 'أي قوة خارقة ستختار؟'),
  S('know', "What's your usual coffee or tea order?", 'طلبك المعتاد من القهوة أو الشاي؟'),
  S('know', 'What would you name a pet goldfish?', 'ماذا ستسمّي سمكة زينة لو اقتنيتها؟'),
  S('know', 'The chore you hate the most?', 'أكثر عمل منزلي تكرهه؟'),
  S('know', "A dish you'd cook to impress someone?", 'طبق تطبخه لتُبهر أحدًا؟'),
  S('know', 'Your favorite season?', 'فصلك المفضّل؟'),
  S('know', 'Your dream job as a kid?', 'وظيفة أحلامك وأنت صغير؟'),
  S('know', 'The first app you open in the morning?', 'أول تطبيق تفتحه في الصباح؟'),

  S('wave', "Name something you'd find in a messy storage room", 'شيء تجده في مخزن فوضوي'),
  S('wave', "Name a fruit that's seriously underrated", 'فاكهة لا تأخذ حقها'),
  S('wave', "Name something that's always sticky", 'شيء دائمًا لزج'),
  S('wave', 'Name a famous cartoon character', 'شخصية كرتونية مشهورة'),
  S('wave', 'Name something people bring to the beach', 'شيء يأخذه الناس معهم إلى البحر'),
  S('wave', "Name something you'd find in a grandma's bag", 'شيء تجده في حقيبة الجدّة'),
  S('wave', 'Name a classic excuse for being late', 'عذر كلاسيكي للتأخير'),
  S('wave', 'Name something that comes in pairs', 'شيء يأتي على شكل زوج'),
  S('wave', 'Name a board game everyone knows', 'لعبة لوحية يعرفها الجميع'),
  S('wave', 'Name a vegetable kids refuse to eat', 'خضار يرفض الأطفال أكله'),
  S('wave', 'Name a famous landmark', 'معلم سياحي شهير'),
  S('wave', 'Name something that makes a loud noise', 'شيء يصدر صوتًا عاليًا'),
  S('wave', "Name something you'd find in the desert", 'شيء تجده في الصحراء'),
  S('wave', 'Name a sport you can play indoors', 'رياضة تُلعب في مكان مغلق'),
  S('wave', 'Name something yellow', 'شيء لونه أصفر'),

  S('blank', 'The best thing about rainy days is ___', 'أجمل شيء في الأيام الممطرة هو ___'),
  S('blank', "A perfect evening out isn't complete without ___", 'السهرة المثالية لا تكتمل بدون ___'),
  S('blank', "If I could eat only one food forever, it'd be ___", 'لو أكلت أكلة واحدة طوال حياتي، ستكون ___'),
  S('blank', 'The most overrated trend is ___', 'أكثر ترند مُبالغ فيه هو ___'),
  S('blank', 'Every kitchen needs a ___', 'كل مطبخ يحتاج إلى ___'),
  S('blank', 'The world would be better with more ___', 'سيصبح العالم أجمل لو فيه المزيد من ___'),
  S('blank', "A road trip isn't complete without ___", 'رحلة السيارة لا تكتمل بدون ___'),
  S('blank', 'My villain origin story starts with ___', 'قصة تحوّلي إلى شرير تبدأ بـ ___'),
  S('blank', "Never trust someone who doesn't like ___", 'لا تثق بشخص لا يحب ___'),
  S('blank', 'The best time of day is ___', 'أفضل وقت في اليوم هو ___'),
];

export function drawSyncPrompt(used) {
  return structuredClone(SYNC_PROMPTS[drawIndex(SYNC_PROMPTS, used)]);
}

/* ------------------------------------------------------------------ */
/* Decision — a situation with four options                            */
/* ------------------------------------------------------------------ */

const D = (en, ar, choices) => ({
  category: 'decide',
  text: { en, ar },
  choices: choices.map(([cen, car]) => ({ en: cen, ar: car })),
});

export const DECISIONS = [
  D('You find a wallet full of cash with no ID inside.', 'وجدت محفظة مليئة بالنقود بدون أي إثبات هوية.', [
    ['Hand it to the police', 'أسلّمها للشرطة'],
    ['Post about it online to find the owner', 'أنشر عنها في الإنترنت لأجد صاحبها'],
    ['Ask people nearby if it’s theirs', 'أسأل من حولي إن كانت لهم'],
    ['Leave it exactly where it was', 'أتركها في مكانها'],
  ]),
  D('Your flight is cancelled and the next one leaves in 12 hours.', 'أُلغيت رحلتك والرحلة التالية بعد 12 ساعة.', [
    ['Book a hotel and sleep', 'أحجز فندقًا وأنام'],
    ['Go explore the city', 'أخرج لأستكشف المدينة'],
    ['Camp at the gate with snacks', 'أبقى عند البوابة مع وجبات خفيفة'],
    ['Argue until they find another option', 'أجادل حتى يجدوا حلًا آخر'],
  ]),
  D('A friend cooks dinner for you and it’s honestly bad.', 'صديقك طبخ لك العشاء والأكل بصراحة سيئ.', [
    ['Eat all of it and praise it', 'آكله كله وأمدحه'],
    ['Eat a little and say I’m full', 'آكل قليلًا وأقول إنني شبعت'],
    ['Tell them kindly', 'أخبره بلطف'],
    ['Suggest ordering food “for a change”', 'أقترح أن نطلب أكلًا "للتغيير"'],
  ]),
  D('You get a completely free day with zero plans.', 'عندك يوم فارغ تمامًا بلا أي خطط.', [
    ['Sleep and binge a series', 'نوم ومسلسلات'],
    ['Go somewhere new', 'أذهب إلى مكان جديد'],
    ['Finally finish my to-do list', 'أنجز المهام المؤجلة أخيرًا'],
    ['Call friends and make plans', 'أتصل بالأصدقاء ونخطط لشيء'],
  ]),
  D('Someone takes the parking spot you were waiting for.', 'شخص أخذ الموقف الذي كنت تنتظره.', [
    ['Let it go', 'أتجاهل الأمر'],
    ['Honk', 'أضغط على البوق'],
    ['Go talk to them', 'أذهب وأكلّمه'],
    ['Leave a note on their car', 'أترك ورقة على سيارته'],
  ]),
  D('Your phone dies and you’re lost in a new city.', 'جوالك انطفأ وأنت تائه في مدينة جديدة.', [
    ['Ask a stranger for directions', 'أسأل شخصًا غريبًا عن الطريق'],
    ['Find a café and charge it', 'أبحث عن مقهى لأشحن الجوال'],
    ['Wander and trust my instincts', 'أتجوّل وأثق بحدسي'],
    ['Take a taxi back to the hotel', 'آخذ سيارة أجرة إلى الفندق'],
  ]),
  D('You can keep only one app on your phone.', 'مسموح لك بتطبيق واحد فقط على جوالك.', [
    ['Messaging', 'المراسلة'],
    ['Maps', 'الخرائط'],
    ['Camera', 'الكاميرا'],
    ['Social media', 'التواصل الاجتماعي'],
  ]),
  D('You’re invited to two events on the same night.', 'دُعيت إلى مناسبتين في نفس الليلة.', [
    ['Pick the one with my closest friends', 'أختار التي فيها أقرب أصدقائي'],
    ['Try to make it to both', 'أحاول حضور الاثنتين'],
    ['Pick the one with better food', 'أختار التي أكلها أفضل'],
    ['Stay home', 'أبقى في البيت'],
  ]),
  D('A spider shows up in your room at midnight.', 'ظهر عنكبوت في غرفتك منتصف الليل.', [
    ['Deal with it myself', 'أتعامل معه بنفسي'],
    ['Call someone for help', 'أطلب المساعدة من أحد'],
    ['Leave the room for the night', 'أغادر الغرفة الليلة'],
    ['Pretend I didn’t see it', 'أتظاهر أنني لم أره'],
  ]),
  D('You get a surprise bonus at work.', 'حصلت على مكافأة مفاجئة في العمل.', [
    ['Save all of it', 'أدّخرها كلها'],
    ['Book a trip', 'أحجز رحلة'],
    ['Treat family and friends', 'أفاجئ عائلتي وأصدقائي'],
    ['Buy something I’ve wanted for ages', 'أشتري شيئًا أريده منذ زمن'],
  ]),
  D('Nobody in your group project is doing anything.', 'لا أحد في مشروع المجموعة يعمل شيئًا.', [
    ['Take charge and assign tasks', 'أتولّى القيادة وأوزّع المهام'],
    ['Do everything myself', 'أنجز كل شيء بنفسي'],
    ['Wait for someone else to start', 'أنتظر أن يبدأ أحد غيري'],
    ['Tell the teacher or manager', 'أخبر المعلم أو المدير'],
  ]),
  D('You send a message to the wrong group chat.', 'أرسلت رسالة إلى المجموعة الخطأ.', [
    ['Delete it fast and hope', 'أحذفها بسرعة وأتمنى ألا يراها أحد'],
    ['Own it with a joke', 'أعترف بها بنكتة'],
    ['Leave the group', 'أخرج من المجموعة'],
    ['Act like I meant it', 'أتصرف وكأنني قصدتها'],
  ]),
  D('At an open buffet, your first plate is…', 'في البوفيه المفتوح، صحنك الأول هو…', [
    ['A bit of everything', 'قليل من كل شيء'],
    ['Straight to dessert', 'مباشرة إلى الحلويات'],
    ['My usual favorite', 'المفضّل نفسه كل مرة'],
    ['A healthy salad first', 'سلطة صحية أولًا'],
  ]),
  D('Someone spoils the ending of a show you’re watching.', 'شخص حرق لك نهاية مسلسل تتابعه.', [
    ['Laugh it off', 'أضحك وأتجاوز'],
    ['Never forgive them', 'لن أسامحه أبدًا'],
    ['Stop watching', 'أتوقف عن المشاهدة'],
    ['Keep watching to see how it happens', 'أكمل لأرى كيف حدث ذلك'],
  ]),
  D('You can master one skill instantly.', 'يمكنك إتقان مهارة واحدة فورًا.', [
    ['A new language', 'لغة جديدة'],
    ['Cooking', 'الطبخ'],
    ['Drawing', 'الرسم'],
    ['Coding', 'البرمجة'],
  ]),
  D('A friend asks you to keep a big secret.', 'صديقك طلب منك أن تحفظ سرًا كبيرًا.', [
    ['Keep it forever', 'أحفظه للأبد'],
    ['Tell only my closest person', 'أخبر أقرب شخص لي فقط'],
    ['Ask them not to tell me', 'أطلب منه ألا يخبرني'],
    ['I’ll probably forget it anyway', 'غالبًا سأنساه على أي حال'],
  ]),
  D('It’s 2am and you’re hungry.', 'الساعة الثانية فجرًا وأنت جائع.', [
    ['Order delivery', 'أطلب توصيل'],
    ['Cook something', 'أطبخ شيئًا'],
    ['Eat whatever is in the fridge', 'آكل أي شيء في الثلاجة'],
    ['Go back to sleep', 'أعود للنوم'],
  ]),
  D('You win a free trip, but you have to leave tomorrow.', 'ربحت رحلة مجانية، لكن يجب أن تسافر غدًا.', [
    ['Pack and go', 'أجهّز حقيبتي وأسافر'],
    ['Ask to change the date', 'أطلب تغيير الموعد'],
    ['Give it to someone else', 'أعطيها لشخص آخر'],
    ['Overthink until it’s too late', 'أفكر كثيرًا حتى يفوت الأوان'],
  ]),
  D('A stranger compliments your outfit.', 'شخص غريب أعجبه لبسك.', [
    ['Say thanks and smile', 'أشكره وأبتسم'],
    ['Get awkward', 'أرتبك'],
    ['Compliment them back', 'أرد له المجاملة'],
    ['Tell them where I bought it', 'أخبره من أين اشتريته'],
  ]),
  D('Your team is losing badly in a game with friends.', 'فريقك يخسر بشدة في لعبة مع الأصدقاء.', [
    ['Play harder', 'ألعب بجدية أكبر'],
    ['Joke about it', 'أمزح حول الأمر'],
    ['Blame the rules', 'ألوم القوانين'],
    ['Suggest a different game', 'أقترح لعبة أخرى'],
  ]),
  D('Your alarm didn’t go off and you’re already late.', 'المنبّه لم يرن وأنت متأخر أصلًا.', [
    ['Rush out in five minutes', 'أخرج مسرعًا خلال خمس دقائق'],
    ['Call and explain honestly', 'أتصل وأشرح بصراحة'],
    ['Take my time — late is late', 'آخذ وقتي، التأخير تأخير'],
    ['Call in sick', 'أعتذر بأنني مريض'],
  ]),
  D('You have to give a speech with no preparation.', 'عليك أن تلقي كلمة بدون أي تحضير.', [
    ['Wing it confidently', 'أرتجل بثقة'],
    ['Keep it very short', 'أجعلها قصيرة جدًا'],
    ['Open with a joke', 'أبدأ بنكتة'],
    ['Find a way out of it', 'أبحث عن طريقة للتهرب'],
  ]),
];

export function drawDecision(used) {
  return structuredClone(DECISIONS[drawIndex(DECISIONS, used)]);
}

/* ------------------------------------------------------------------ */
/* Priorities — rank four items 1–4 (1 = top priority)                  */
/* ------------------------------------------------------------------ */

const P = (en, ar, items) => ({
  category: 'rank',
  text: { en, ar },
  items: items.map(([ien, iar]) => ({ en: ien, ar: iar })),
});

export const PRIORITIES = [
  P('Rank what matters most on a weekend trip', 'رتّب الأهم في رحلة نهاية الأسبوع', [
    ['Good food', 'أكل لذيذ'], ['A comfortable stay', 'سكن مريح'], ['Activities', 'أنشطة'], ['Rest', 'راحة'],
  ]),
  P("Rank what you'd miss most for a month", 'رتّب ما ستفتقده أكثر لمدة شهر', [
    ['Your phone', 'الجوال'], ['Coffee', 'القهوة'], ['Social media', 'التواصل الاجتماعي'], ['Sweets', 'الحلويات'],
  ]),
  P('Rank what makes a great friend', 'رتّب ما يصنع الصديق الرائع', [
    ['Loyalty', 'الوفاء'], ['Humor', 'خفة الدم'], ['Honesty', 'الصراحة'], ['Always being there', 'التواجد دائمًا'],
  ]),
  P('Rank how you’d spend a free evening', 'رتّب كيف تقضي أمسية فارغة', [
    ['Movie at home', 'فيلم في البيت'], ['Dinner out', 'عشاء في الخارج'], ['Video games', 'ألعاب فيديو'], ['Seeing friends', 'لقاء الأصدقاء'],
  ]),
  P('Rank these meals', 'رتّب هذه الوجبات', [
    ['Breakfast', 'الفطور'], ['Lunch', 'الغداء'], ['Dinner', 'العشاء'], ['Late-night snack', 'سناك آخر الليل'],
  ]),
  P('Rank what matters most in a job', 'رتّب الأهم في الوظيفة', [
    ['Salary', 'الراتب'], ['The team', 'فريق العمل'], ['Flexibility', 'المرونة'], ['Meaningful work', 'عمل له معنى'],
  ]),
  P('Rank the seasons', 'رتّب فصول السنة', [
    ['Summer', 'الصيف'], ['Winter', 'الشتاء'], ['Spring', 'الربيع'], ['Autumn', 'الخريف'],
  ]),
  P('Rank these kinds of trips', 'رتّب أنواع الرحلات هذه', [
    ['Beach', 'شاطئ'], ['Mountains', 'جبال'], ['Big city', 'مدينة كبيرة'], ['Desert camping', 'تخييم في البر'],
  ]),
  P("Rank what you'd want on a desert island", 'رتّب ما تريده معك في جزيرة مهجورة', [
    ['A knife', 'سكين'], ['A water filter', 'فلتر ماء'], ['A lighter', 'ولاعة'], ['A tent', 'خيمة'],
  ]),
  P('Rank these drinks', 'رتّب هذه المشروبات', [
    ['Coffee', 'قهوة'], ['Tea', 'شاي'], ['Juice', 'عصير'], ['Water', 'ماء'],
  ]),
  P('Rank what annoys you most', 'رتّب أكثر ما يزعجك', [
    ['Slow internet', 'الإنترنت البطيء'], ['Loud chewing', 'صوت المضغ'], ['People running late', 'تأخر الناس'], ['Traffic', 'الزحمة'],
  ]),
  P('Rank these superpowers', 'رتّب هذه القوى الخارقة', [
    ['Flying', 'الطيران'], ['Invisibility', 'الاختفاء'], ['Teleporting', 'الانتقال الفوري'], ['Reading minds', 'قراءة الأفكار'],
  ]),
  P("Rank what you'd splurge on", 'رتّب ما تحب أن تصرف عليه', [
    ['Travel', 'السفر'], ['Gadgets', 'الأجهزة'], ['Clothes', 'الملابس'], ['Food', 'الأكل'],
  ]),
  P('Rank these ways to relax', 'رتّب طرق الاسترخاء هذه', [
    ['Sleeping', 'النوم'], ['Exercise', 'الرياضة'], ['A long drive', 'مشوار بالسيارة'], ['Reading', 'القراءة'],
  ]),
  P('Rank what makes a home cozy', 'رتّب ما يجعل البيت مريحًا', [
    ['Warm lighting', 'إضاءة دافئة'], ['Plants', 'النباتات'], ['A great sofa', 'كنبة مريحة'], ['A nice smell', 'رائحة طيبة'],
  ]),
  P('Rank these desserts', 'رتّب هذه الحلويات', [
    ['Kunafa', 'كنافة'], ['Ice cream', 'آيس كريم'], ['Chocolate cake', 'كيكة شوكولاتة'], ['Dates', 'تمر'],
  ]),
  P('Rank what you want in a travel partner', 'رتّب ما تريده في رفيق السفر', [
    ['Good planning', 'التخطيط الجيد'], ['Patience', 'الصبر'], ['Fun', 'المرح'], ['Spending wisely', 'الاقتصاد في المصاريف'],
  ]),
  P('Rank these morning habits', 'رتّب عادات الصباح هذه', [
    ['Coffee first', 'القهوة أولًا'], ['Checking my phone', 'تفقد الجوال'], ['Exercise', 'الرياضة'], ['Hitting snooze', 'تأجيل المنبّه'],
  ]),
];

export function drawPriority(used) {
  return structuredClone(PRIORITIES[drawIndex(PRIORITIES, used)]);
}

/* ------------------------------------------------------------------ */
/* Telepathy — 3×3 well plate                                          */
/* ------------------------------------------------------------------ */

const T = (en, ar) => ({ en, ar });

const GENERIC_TELEPATHY_PROMPTS = [
  T('Pick the one your partner will pick', 'اختر ما سيختاره شريكك'),
  T('Pick the first one that catches your eye', 'اختر أول ما يلفت نظرك'),
  T('Pick the odd one out', 'اختر الشيء المختلف عن البقية'),
  T('Pick your favorite', 'اختر المفضّل لديك'),
  T('Pick the one that best represents your pair', 'اختر ما يمثّلكما أكثر'),
];

const emojiSet = (name, items, prompts) => ({
  name,
  kind: 'emoji',
  prompts,
  make: () => shuffle(items).slice(0, 9).map((e) => ({ display: e })),
});

const TELEPATHY_SETS = [
  emojiSet(
    T('Late-night snacks', 'وجبات خفيفة'),
    ['🍕', '🍣', '🌮', '🍔', '🍩', '🍜', '🥐', '🍓', '🧀', '🍫', '🥑', '🍿', '🍪', '🥨', '🍉', '🌯'],
    [
      T("Pick the snack you'd share at 2am", 'اختر الوجبة التي ستتشاركانها في الثانية فجرًا'),
      T('Pick what your partner is craving right now', 'اختر ما يشتهيه شريكك الآن'),
    ],
  ),
  emojiSet(
    T('Wild kingdom', 'مملكة الحيوان'),
    ['🦊', '🐼', '🐙', '🦄', '🐢', '🦁', '🐧', '🦥', '🐝', '🦩', '🐳', '🦔', '🐸', '🦉', '🐨', '🐪'],
    [
      T('Pick your spirit animal as a pair', 'اختر الحيوان الذي يمثّلكما معًا'),
      T('Pick the animal your partner would adopt', 'اختر الحيوان الذي سيتبنّاه شريكك'),
    ],
  ),
  emojiSet(
    T('Wanderlust', 'شغف السفر'),
    ['🏝️', '🏔️', '🏙️', '🏜️', '🏕️', '🗼', '🏰', '🌋', '🎡', '🛶', '🚂', '🛸', '🎢', '🌌', '🗻', '🏞️'],
    [
      T('Pick your next trip together', 'اختر رحلتكما القادمة'),
      T("Pick where you'd hide from the world", 'اختر مكانًا تختبئان فيه من العالم'),
    ],
  ),
  emojiSet(
    T('Mood check', 'فحص المزاج'),
    ['🌈', '⚡', '❄️', '🔥', '🌙', '☀️', '🌊', '🌪️', '🍂', '🌸', '⭐', '☁️', '🌵', '🍄', '🫧', '💎'],
    [
      T("Pick today's mood", 'اختر مزاج اليوم'),
      T('Pick the energy of your friendship', 'اختر طاقة علاقتكما'),
    ],
  ),
  emojiSet(
    T('Belongings', 'أغراض'),
    ['🎸', '📚', '🎮', '🧸', '☕', '🎧', '📷', '🕯️', '🪴', '🎲', '🧩', '🛹', '🔭', '🎨', '🪁', '🧶'],
    [
      T('Pick the gift your partner would love', 'اختر الهدية التي ستعجب شريكك'),
      T("Pick what you'd save from a fire", 'اختر ما ستنقذه من حريق'),
    ],
  ),
  emojiSet(
    T('Faces', 'وجوه'),
    ['😂', '😍', '😎', '🤔', '😴', '🥳', '😱', '🤯', '😇', '🤠', '😈', '🥺', '🙃', '🤓', '😤', '🫠'],
    [
      T('Pick your partner on the first morning of the work week', 'اختر شكل شريكك في أول صباح من أسبوع العمل'),
      T('Pick your face right now', 'اختر وجهك الآن'),
    ],
  ),
  {
    name: T('Palette', 'ألوان'),
    kind: 'color',
    prompts: [
      T('Pick the color of your relationship', 'اختر لون علاقتكما'),
      T("Pick the color of today's mood", 'اختر لون مزاج اليوم'),
    ],
    make: () =>
      shuffle([
        { label: T('Coral', 'مرجاني'), color: '#ff6b5b' },
        { label: T('Sunflower', 'عبّاد الشمس'), color: '#ffcc33' },
        { label: T('Mint', 'نعناعي'), color: '#4ade80' },
        { label: T('Ocean', 'محيطي'), color: '#38bdf8' },
        { label: T('Indigo', 'نيلي'), color: '#4f46e5' },
        { label: T('Grape', 'عنبي'), color: '#9333ea' },
        { label: T('Bubblegum', 'وردي'), color: '#f472b6' },
        { label: T('Tangerine', 'يوسفي'), color: '#fb923c' },
        { label: T('Teal', 'فيروزي'), color: '#14b8a6' },
        { label: T('Ruby', 'ياقوتي'), color: '#e11d48' },
        { label: T('Lime', 'ليموني'), color: '#a3e635' },
        { label: T('Snow', 'ثلجي'), color: '#f1f5f9' },
        { label: T('Midnight', 'كحلي'), color: '#1e293b' },
        { label: T('Lavender', 'خزامى'), color: '#c4b5fd' },
      ])
        .slice(0, 9)
        .map((c) => ({ display: '', ...c })),
  },
  {
    name: T('Shapes', 'أشكال'),
    kind: 'shape',
    prompts: [
      T('Pick the shape that feels most like you', 'اختر الشكل الأقرب لشخصيتك'),
      T('Pick the shape your partner would doodle', 'اختر الشكل الذي سيرسمه شريكك'),
    ],
    make: () => {
      const glyphs = ['●', '▲', '■', '◆', '★', '⬟', '♥', '✚', '⬢', '☾', '✦', '◐'];
      const colors = ['#e5383b', '#f48c06', '#e0a100', '#2e9e5b', '#1e88c9', '#5e4ae3', '#13233a'];
      return shuffle(glyphs)
        .slice(0, 9)
        .map((g) => ({ display: g, color: pick(colors) }));
    },
  },
  {
    name: T('Lucky numbers', 'أرقام الحظ'),
    kind: 'number',
    prompts: [
      T('Pick the luckiest number', 'اختر الرقم الأكثر حظًا'),
      T('Pick the number your partner would choose', 'اختر الرقم الذي سيختاره شريكك'),
    ],
    make: () => {
      const nums = new Set();
      while (nums.size < 9) nums.add(1 + Math.floor(Math.random() * 99));
      return [...nums].map((n) => ({ display: String(n) }));
    },
  },
  {
    name: T('Words', 'كلمات'),
    kind: 'word',
    prompts: [
      T('Pick the coziest-sounding word', 'اختر الكلمة الأكثر دفئًا'),
      T('Pick the word that sounds like your partner', 'اختر الكلمة التي تشبه شريكك'),
    ],
    make: () =>
      shuffle([
        T('Ocean', 'محيط'), T('Thunder', 'رعد'), T('Velvet', 'مخمل'), T('Cactus', 'صبّار'),
        T('Lantern', 'فانوس'), T('Marble', 'رخام'), T('Honey', 'عسل'), T('Comet', 'مذنّب'),
        T('Whisper', 'همس'), T('Palm tree', 'نخلة'), T('Echo', 'صدى'), T('Ember', 'جمر'),
        T('Pickle', 'مخلّل'), T('Galaxy', 'مجرّة'), T('Pebble', 'حصاة'), T('Dune', 'كثيب'),
      ])
        .slice(0, 9)
        .map((w) => ({ display: w })),
  },
];

/** Builds a fresh 3×3 telepathy grid, avoiding recently-used sets. */
export function buildTelepathyGrid(used) {
  const set = TELEPATHY_SETS[drawIndex(TELEPATHY_SETS, used)];
  const text = Math.random() < 0.65 ? pick(set.prompts) : pick(GENERIC_TELEPATHY_PROMPTS);
  return {
    prompt: { category: 'telepathy', setName: set.name, text },
    grid: { kind: set.kind, cols: 3, items: set.make() },
  };
}

/* ------------------------------------------------------------------ */
/* Lobby                                                               */
/* ------------------------------------------------------------------ */

/** Pairs are identified by an element (rendered client-side with name, symbol, flame color). */
export const ELEMENT_COUNT = 12;

export const AVATARS = [
  '🦊', '🐼', '🐙', '🦄', '🐢', '🦁', '🐧', '🦥', '🐝', '🦩', '🐳', '🦔',
  '🐸', '🦉', '🐨', '🐪', '🐯', '🐰', '🦋', '🐶', '🐱', '🐻', '🦦', '🐲',
];
