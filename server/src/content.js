/**
 * Game content — every player-facing string is bilingual: { en, ar }.
 * The client renders whichever language each player has chosen, so a mixed
 * Arabic/English group sees the same prompt in their own language.
 *
 * Every question belongs to a THEME that the host selects in the lobby:
 *   light — everyday, playful questions
 *   deep  — philosophy, meaning, identity and values
 *   bonds — relationships, trust and feelings
 * Each round draws only from the selected themes (falling back to the full
 * pool if an experiment has nothing in them).
 *
 * Sync prompts are phrased so the answer can be a word or a short phrase,
 * which keeps answer matching meaningful.
 */

export const THEMES = Object.freeze(['light', 'deep', 'bonds']);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Draw an unused index from `list`, restricted to the selected `themes`.
 * `used` tracks indices already played; once every matching entry has been
 * used, those are recycled. If no entry matches the themes, any entry is fine.
 */
function drawIndex(list, used, themes) {
  let candidates = list.map((_, i) => i).filter((i) => !themes || themes.includes(list[i].theme));
  if (!candidates.length) candidates = list.map((_, i) => i);
  let available = candidates.filter((i) => !used.has(i));
  if (!available.length) {
    for (const i of candidates) used.delete(i);
    available = candidates;
  }
  const index = pick(available);
  used.add(index);
  return index;
}

/** Tag every entry of a list with a theme. */
const themed = (theme, list) => list.map((entry) => ({ ...entry, theme }));

/* ------------------------------------------------------------------ */
/* Sync — answer for yourself, predict your partner                    */
/* `category` is a sub-label shown on the card (translated on client): */
/*   light: know | wave | blank                                        */
/*   deep:  self | meaning | values | blank      bonds: bond | blank   */
/* ------------------------------------------------------------------ */

const S = (category, en, ar) => ({ category, text: { en, ar } });

const LIGHT_SYNC = [
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

const DEEP_SYNC = [
  // Inner self
  S('self', 'In one word, who are you really?', 'بكلمة واحدة، من أنت حقًا؟'),
  S('self', "What's your biggest fear about the future?", 'ما أكبر مخاوفك من المستقبل؟'),
  S('self', 'What do you pretend not to care about?', 'ما الشيء الذي تتظاهر بأنك لا تهتم به؟'),
  S('self', 'Which emotion do you hide the most?', 'أي شعور تخفيه أكثر من غيره؟'),
  S('self', 'What part of yourself are you still learning to accept?', 'أي جزء من نفسك ما زلت تتعلّم تقبّله؟'),
  S('self', 'What would surprise your younger self most about you today?', 'ما الذي سيفاجئ نسختك الصغيرة فيك اليوم؟'),
  S('self', 'What do you need more of right now?', 'ما الذي تحتاج المزيد منه الآن؟'),
  S('self', 'In one word, how do you want people to feel around you?', 'بكلمة واحدة، كيف تريد أن يشعر الناس حولك؟'),
  S('self', 'What belief have you completely changed your mind about?', 'ما القناعة التي غيّرت رأيك فيها تمامًا؟'),
  S('self', 'What makes you feel most alive?', 'ما الذي يجعلك تشعر بأنك حيّ فعلًا؟'),

  // Meaning
  S('meaning', 'In one word, what makes a life well lived?', 'بكلمة واحدة، ما الذي يجعل الحياة تستحق أن تُعاش؟'),
  S('meaning', 'What is happiness, really?', 'ما هي السعادة حقًا؟'),
  S('meaning', 'What do you want to be remembered for?', 'بماذا تحب أن يتذكرك الناس؟'),
  S('meaning', 'What is the most valuable thing a person can have?', 'ما أثمن شيء يمكن أن يملكه الإنسان؟'),
  S('meaning', 'What is the opposite of love?', 'ما عكس الحب؟'),
  S('meaning', 'What is one thing money can never buy?', 'ما الشيء الذي لا يستطيع المال شراءه أبدًا؟'),
  S('meaning', 'What is pain for?', 'ما الغاية من الألم؟'),
  S('meaning', 'What are most people really searching for?', 'ما الذي يبحث عنه معظم الناس فعلًا؟'),
  S('meaning', 'If you could know the answer to one question, what would you ask?', 'لو أمكنك معرفة إجابة سؤال واحد، ماذا ستسأل؟'),
  S('meaning', 'In one word, what is time?', 'بكلمة واحدة، ما هو الوقت؟'),

  // Values
  S('values', 'What value would you never compromise on?', 'ما القيمة التي لا تتنازل عنها أبدًا؟'),
  S('values', 'What trait do you admire most in others?', 'ما الصفة التي تعجبك أكثر في الآخرين؟'),
  S('values', 'What is the hardest thing to forgive?', 'ما أصعب شيء يمكن مسامحته؟'),
  S('values', 'In one word, what does success mean to you?', 'بكلمة واحدة، ماذا يعني لك النجاح؟'),
  S('values', 'What lie do people tell themselves most often?', 'ما الكذبة التي يكذبها الناس على أنفسهم كثيرًا؟'),
  S('values', 'What makes someone trustworthy?', 'ما الذي يجعل الشخص جديرًا بالثقة؟'),
  S('values', 'In one word, what is courage?', 'بكلمة واحدة، ما هي الشجاعة؟'),
  S('values', 'What do you think is wrong with the world today?', 'ما الخلل الأكبر في العالم اليوم برأيك؟'),

  // Bonds
  S('bond', 'How can you tell someone truly cares about you?', 'كيف تعرف أن شخصًا يهتم بك فعلًا؟'),
  S('bond', 'How do you show love without saying it?', 'كيف تعبّر عن محبتك دون أن تقولها؟'),
  S('bond', 'What do you need most from the people closest to you?', 'ما الذي تحتاجه أكثر من أقرب الناس إليك؟'),
  S('bond', 'What breaks trust fastest?', 'ما الذي يكسر الثقة أسرع من أي شيء؟'),
  S('bond', 'What makes a friendship last?', 'ما الذي يجعل الصداقة تدوم؟'),
  S('bond', 'What small thing means a lot to you?', 'ما الشيء الصغير الذي يعني لك الكثير؟'),
  S('bond', 'When do you feel most understood?', 'متى تشعر بأنك مفهوم أكثر؟'),
  S('bond', 'What do you find hardest to ask for?', 'ما أصعب شيء عليك أن تطلبه من الآخرين؟'),

  // Fill in the blank
  S('blank', 'The world would be kinder if everyone ___', 'سيكون العالم ألطف لو أن الجميع ___'),
  S('blank', 'I feel most at peace when ___', 'أشعر بالسلام أكثر عندما ___'),
  S('blank', 'The best advice I ever got was ___', 'أفضل نصيحة تلقيتها كانت ___'),
  S('blank', "I'm still learning how to ___", 'ما زلت أتعلّم كيف ___'),
  S('blank', 'Growing up means ___', 'أن تكبر يعني ___'),
  S('blank', 'Home is ___', 'البيت هو ___'),
  S('blank', 'Real friendship is ___', 'الصداقة الحقيقية هي ___'),
  S('blank', 'I wish I could tell my younger self ___', 'أتمنى لو أقول لنفسي الصغيرة ___'),
  S('blank', "The thing I'm most grateful for is ___", 'أكثر ما أشعر بالامتنان له هو ___'),
  S('blank', 'Regret teaches us ___', 'الندم يعلّمنا ___'),
];

/** Deep-pack fill-ins that are really about relationships. */
const BOND_BLANKS = new Set(['Home is ___', 'Real friendship is ___']);

export const SYNC_PROMPTS = [
  ...themed('light', LIGHT_SYNC),
  ...DEEP_SYNC.map((p) => ({
    ...p,
    theme: p.category === 'bond' || BOND_BLANKS.has(p.text.en) ? 'bonds' : 'deep',
  })),
];

export function drawSyncPrompt(used, themes) {
  return structuredClone(SYNC_PROMPTS[drawIndex(SYNC_PROMPTS, used, themes)]);
}

/* ------------------------------------------------------------------ */
/* Decision — a situation (light) or dilemma (deep / bonds), 4 options */
/* ------------------------------------------------------------------ */

const D = (en, ar, choices) => ({
  category: 'decide',
  text: { en, ar },
  choices: choices.map(([cen, car]) => ({ en: cen, ar: car })),
});

const LIGHT_DECISIONS = [
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

const DEEP_DECISIONS = [
  D('A runaway train will hit five people unless you pull a lever that sends it toward one person.', 'قطار خارج عن السيطرة سيصدم خمسة أشخاص، إلا إذا سحبت ذراعًا يحوّله نحو شخص واحد.', [
    ['Pull the lever', 'أسحب الذراع'],
    ['Don’t touch it', 'لا ألمسه'],
    ['Shout to warn them', 'أصرخ لتحذيرهم'],
    ['Freeze', 'أتجمّد في مكاني'],
  ]),
  D('A machine can give you a lifetime of happiness, but none of it would be real.', 'آلة يمكنها أن تمنحك سعادة مدى الحياة، لكن لا شيء منها سيكون حقيقيًا.', [
    ['Plug in', 'أدخل'],
    ['Refuse', 'أرفض'],
    ['Try it for one day', 'أجرّبها ليوم واحد'],
    ['Only when I’m old', 'فقط عندما أكبر في السن'],
  ]),
  D('You learn a close friend lied to you to protect your feelings.', 'اكتشفت أن صديقًا مقربًا كذب عليك ليحمي مشاعرك.', [
    ['Thank them', 'أشكره'],
    ['Confront them', 'أواجهه'],
    ['Let it go quietly', 'أتجاوز الأمر بصمت'],
    ['Trust them a little less', 'أثق به أقل قليلًا'],
  ]),
  D('You can learn one truth about your future.', 'يمكنك معرفة حقيقة واحدة عن مستقبلك.', [
    ['When I’ll be happiest', 'متى سأكون في أسعد حالاتي'],
    ['What I’ll regret most', 'ما الذي سأندم عليه أكثر'],
    ['Who will stay in my life', 'من سيبقى في حياتي'],
    ['Whether I’ll reach my dream', 'هل سأحقق حلمي'],
  ]),
  D('You’re offered your dream life, but you must move far from everyone you know.', 'عُرضت عليك حياة أحلامك، لكن عليك الابتعاد عن كل من تعرفهم.', [
    ['Go', 'أذهب'],
    ['Stay', 'أبقى'],
    ['Try it for a year first', 'أجرّب سنة أولًا'],
    ['Take one person with me', 'آخذ شخصًا واحدًا معي'],
  ]),
  D('You can erase one painful memory forever.', 'يمكنك محو ذكرى مؤلمة واحدة إلى الأبد.', [
    ['Erase it', 'أمحوها'],
    ['Keep it — it shaped me', 'أحتفظ بها، فقد صنعتني'],
    ['Erase it but keep the lesson', 'أمحوها وأحتفظ بالدرس'],
    ['Give the chance to someone else', 'أعطي الفرصة لشخص آخر'],
  ]),
  D('Your best friend asks your honest opinion on a decision you think is a mistake.', 'صديقك المقرّب يسألك عن رأيك الصريح في قرار تراه خطأ.', [
    ['Tell the full truth', 'أقول الحقيقة كاملة'],
    ['Support them anyway', 'أدعمه على أي حال'],
    ['Ask questions that guide them', 'أطرح أسئلة توجّهه'],
    ['Stay neutral', 'أبقى محايدًا'],
  ]),
  D('You can fix one thing in the world.', 'يمكنك إصلاح شيء واحد في العالم.', [
    ['End hunger', 'إنهاء الجوع'],
    ['End war', 'إنهاء الحروب'],
    ['Cure all disease', 'علاج كل الأمراض'],
    ['End loneliness', 'إنهاء الوحدة'],
  ]),
  D('You realise you’ve been wrong about something important for years.', 'أدركت أنك كنت مخطئًا في أمر مهم لسنوات.', [
    ['Admit it openly', 'أعترف بذلك علنًا'],
    ['Change quietly', 'أتغيّر بهدوء'],
    ['Look into it more first', 'أبحث أكثر أولًا'],
    ['Keep my old view', 'أتمسّك برأيي القديم'],
  ]),
  D('You’re praised for work a colleague actually did.', 'تلقيت مديحًا على عمل قام به زميلك في الحقيقة.', [
    ['Correct it right away', 'أصحّح الأمر فورًا'],
    ['Tell my colleague privately', 'أخبر زميلي على انفراد'],
    ['Credit them next time', 'أنسب الفضل له في المرة القادمة'],
    ['Say nothing', 'لا أقول شيئًا'],
  ]),
  D('You have one year left to live.', 'تبقّت لك سنة واحدة في الحياة.', [
    ['Travel the world', 'أسافر حول العالم'],
    ['Spend it with family', 'أقضيها مع عائلتي'],
    ['Create something that lasts', 'أصنع شيئًا يبقى بعدي'],
    ['Live as I do now', 'أعيش كما أعيش الآن'],
  ]),
  D('Someone who hurt you deeply now sincerely apologises.', 'شخص جرحك بعمق يعتذر لك الآن بصدق.', [
    ['Forgive fully', 'أسامح تمامًا'],
    ['Forgive but keep my distance', 'أسامح مع الحفاظ على مسافة'],
    ['I need more time', 'أحتاج وقتًا أكثر'],
    ['I’m not ready to forgive', 'لست مستعدًا للمسامحة'],
  ]),
  D('Once, you can see exactly how other people see you.', 'مرة واحدة فقط، يمكنك أن ترى كيف يراك الآخرون بالضبط.', [
    ['Look', 'أنظر'],
    ['Never look', 'لا أنظر أبدًا'],
    ['Only the people closest to me', 'فقط من هم أقرب الناس إليّ'],
    ['Only strangers', 'فقط الغرباء'],
  ]),
  D('You find the private journal of someone you love.', 'وجدت المذكرات الخاصة لشخص تحبه.', [
    ['Read it', 'أقرؤها'],
    ['Return it unread', 'أعيدها دون أن أقرأها'],
    ['Read just one page', 'أقرأ صفحة واحدة فقط'],
    ['Tell them I found it', 'أخبره أنني وجدتها'],
  ]),
  D('You can restart your life at 18, keeping everything you know now.', 'يمكنك أن تبدأ حياتك من جديد بعمر 18 مع كل ما تعرفه الآن.', [
    ['Restart', 'أبدأ من جديد'],
    ['Stay where I am', 'أبقى حيث أنا'],
    ['Only if my loved ones come too', 'فقط إن جاء أحبّائي معي'],
    ['Ask someone I love first', 'أستشير شخصًا أحبه أولًا'],
  ]),
  D('You learn a secret that would hurt a friend if they knew.', 'عرفت سرًا سيؤذي صديقك لو علم به.', [
    ['Tell them', 'أخبره'],
    ['Keep it', 'أكتمه'],
    ['Hint at it', 'ألمّح له'],
    ['Let someone else tell them', 'أترك غيري يخبره'],
  ]),
  D('You can live forever, but everyone you know will not.', 'يمكنك أن تعيش للأبد، لكن كل من تعرفهم لن يعيشوا مثلك.', [
    ['Accept', 'أقبل'],
    ['Refuse', 'أرفض'],
    ['Only if one person can join me', 'فقط إن أمكن لشخص واحد أن ينضم إليّ'],
    ['Accept, then find a way out', 'أقبل ثم أبحث عن مخرج'],
  ]),
  D('A stranger’s small mistake will cost them their job unless you take the blame.', 'خطأ صغير لشخص غريب سيكلّفه وظيفته، إلا إذا تحمّلت أنت اللوم.', [
    ['Take the blame', 'أتحمّل اللوم'],
    ['Stay out of it', 'أبقى بعيدًا'],
    ['Tell the truth gently', 'أقول الحقيقة بلطف'],
    ['Quietly help them fix it', 'أساعده بهدوء على إصلاحه'],
  ]),
];

/** Dilemmas about the people in your life rather than abstract ethics. */
const BOND_DECISION_PREFIXES = [
  'You learn a close friend lied',
  'Your best friend asks',
  'Someone who hurt you',
  'You find the private journal',
  'You learn a secret',
  'Once, you can see exactly how',
];

export const DECISIONS = [
  ...themed('light', LIGHT_DECISIONS),
  ...DEEP_DECISIONS.map((d) => ({
    ...d,
    category: 'dilemma',
    theme: BOND_DECISION_PREFIXES.some((p) => d.text.en.startsWith(p)) ? 'bonds' : 'deep',
  })),
];

export function drawDecision(used, themes) {
  return structuredClone(DECISIONS[drawIndex(DECISIONS, used, themes)]);
}

/* ------------------------------------------------------------------ */
/* Would you rather — two hard options                                 */
/* ------------------------------------------------------------------ */

const WYR_TEXT = { en: 'Would you rather…', ar: 'ماذا تفضّل؟' };
const R = (theme, [aen, aar], [ben, bar]) => ({
  category: 'rather',
  theme,
  text: WYR_TEXT,
  choices: [
    { en: aen, ar: aar },
    { en: ben, ar: bar },
  ],
});

const LIGHT_RATHERS = [
  R('light', ['Always be 10 minutes late', 'تتأخر دائمًا 10 دقائق'], ['Always be 20 minutes early', 'تصل دائمًا قبل الموعد بـ 20 دقيقة']),
  R('light', ['Give up coffee forever', 'تتخلى عن القهوة للأبد'], ['Give up sweets forever', 'تتخلى عن الحلويات للأبد']),
  R('light', ['Live by the sea', 'تعيش بجانب البحر'], ['Live in the mountains', 'تعيش في الجبال']),
  R('light', ['Be able to fly', 'تستطيع الطيران'], ['Be able to turn invisible', 'تستطيع الاختفاء']),
  R('light', ['Have a rewind button for your life', 'زر ترجيع لحياتك'], ['Have a pause button for your life', 'زر إيقاف مؤقت لحياتك']),
  R('light', ['Never use social media again', 'لا تستخدم التواصل الاجتماعي مجددًا'], ['Never watch a series again', 'لا تشاهد مسلسلًا مجددًا']),
  R('light', ['Speak every language', 'تتحدث كل اللغات'], ['Talk to animals', 'تتحدث مع الحيوانات']),
  R('light', ['Eat your favorite meal every day', 'تأكل وجبتك المفضلة كل يوم'], ['Never eat it again', 'لا تأكلها مرة أخرى أبدًا']),
  R('light', ['Have a personal chef', 'طاهٍ شخصي'], ['Have a personal driver', 'سائق شخصي']),
  R('light', ['Lose your phone for a month', 'تفقد جوالك لمدة شهر'], ['Lose your car for a month', 'تفقد سيارتك لمدة شهر']),
  R('light', ['Always feel too hot', 'تشعر دائمًا بالحر'], ['Always feel too cold', 'تشعر دائمًا بالبرد']),
  R('light', ['Be the funniest person in the room', 'تكون الأظرف في المكان'], ['Be the best storyteller in the room', 'تكون أفضل راوٍ للقصص في المكان']),
  R('light', ['Travel the world for a year', 'تسافر حول العالم لمدة سنة'], ['Get your dream house', 'تحصل على بيت أحلامك']),
  R('light', ['Only ever whisper', 'لا تتكلم إلا همسًا'], ['Only ever shout', 'لا تتكلم إلا صراخًا']),
  R('light', ['Read every book ever written', 'تقرأ كل كتاب كُتب'], ['Watch every film ever made', 'تشاهد كل فيلم صُنع']),
];

/** Would-you-rathers about love, friendship and other people. */
const BOND_RATHERS = new Set([
  'Be loved but not respected',
  'Be famous and lonely',
  'Forget who you are',
  'Have one true friend',
  'Reach your dream alone',
  'Be understood by everyone',
  'Never be able to say goodbye',
  'Give up all your achievements',
]);

const DEEP_RATHERS = [
  R('deep', ['Know when you will die', 'تعرف متى ستموت'], ['Know how you will die', 'تعرف كيف ستموت']),
  R('deep', ['Relive the same year forever', 'تعيش السنة نفسها إلى الأبد'], ['Skip ahead ten years', 'تقفز عشر سنوات إلى الأمام']),
  R('deep', ['Lose all your memories', 'تفقد كل ذكرياتك'], ['Never make a new memory', 'لا تكوّن أي ذكرى جديدة']),
  R('deep', ['Never be able to lie', 'لا تستطيع الكذب أبدًا'], ['Never know when someone lies to you', 'لا تعرف أبدًا متى يكذب عليك أحد']),
  R('deep', ['Be loved but not respected', 'تكون محبوبًا بلا احترام'], ['Be respected but not loved', 'تكون محترمًا بلا محبة']),
  R('deep', ['Have more time', 'تملك وقتًا أكثر'], ['Have more money', 'تملك مالًا أكثر']),
  R('deep', ['Be famous and lonely', 'تكون مشهورًا ووحيدًا'], ['Be unknown and deeply loved', 'تكون مجهولًا ومحبوبًا بعمق']),
  R('deep', ['Know every truth about yourself', 'تعرف كل الحقيقة عن نفسك'], ['Know every truth about the universe', 'تعرف كل الحقيقة عن الكون']),
  R('deep', ['Change one decision in your past', 'تغيّر قرارًا واحدًا في ماضيك'], ['See one moment of your future', 'ترى لحظة واحدة من مستقبلك']),
  R('deep', ['Live 200 years in average health', 'تعيش 200 سنة بصحة متوسطة'], ['Live 60 years in perfect health', 'تعيش 60 سنة بصحة ممتازة']),
  R('deep', ['Be the smartest person in every room', 'تكون الأذكى في كل مكان'], ['Be the kindest person in every room', 'تكون الألطف في كل مكان']),
  R('deep', ['Have everyone hear your thoughts', 'يسمع الجميع أفكارك'], ['Hear everyone’s thoughts', 'تسمع أفكار الجميع']),
  R('deep', ['Never feel sadness again', 'لا تشعر بالحزن مجددًا'], ['Never feel fear again', 'لا تشعر بالخوف مجددًا']),
  R('deep', ['Forget who you are', 'تنسى من أنت'], ['Forget everyone you love', 'تنسى كل من تحب']),
  R('deep', ['A job you love that pays little', 'وظيفة تحبها براتب قليل'], ['A job you dislike that pays a lot', 'وظيفة لا تحبها براتب كبير']),
  R('deep', ['Have one true friend', 'صديق حقيقي واحد'], ['Have a hundred good friends', 'مئة صديق جيد']),
  R('deep', ['Know a truth that hurts', 'تعرف حقيقة تؤلمك'], ['Believe a lie that comforts you', 'تصدّق كذبة تريحك']),
  R('deep', ['Be remembered for a mistake', 'تُذكر بسبب خطأ'], ['Be completely forgotten', 'تُنسى تمامًا']),
  R('deep', ['Live in any era of the past', 'تعيش في أي عصر من الماضي'], ['Live 100 years in the future', 'تعيش بعد 100 سنة في المستقبل']),
  R('deep', ['Have a perfect memory', 'تملك ذاكرة مثالية'], ['Have perfect intuition', 'تملك حدسًا لا يخطئ']),
  R('deep', ['Always say exactly what you think', 'تقول دائمًا ما تفكر فيه بالضبط'], ['Never share your opinion again', 'لا تشارك رأيك أبدًا']),
  R('deep', ['Reach your dream alone', 'تحقق حلمك وحيدًا'], ['Fail together with the people you love', 'تفشل مع من تحب']),
  R('deep', ['Restart life at 10 with your current mind', 'تبدأ حياتك من جديد بعمر 10 بعقلك الحالي'], ['Continue from today', 'تكمل من اليوم']),
  R('deep', ['Be wise but unhappy', 'تكون حكيمًا وغير سعيد'], ['Be happy but naïve', 'تكون سعيدًا وساذجًا']),
  R('deep', ['Give up all your achievements', 'تتخلى عن كل إنجازاتك'], ['Give up all your memories with friends', 'تتخلى عن كل ذكرياتك مع أصدقائك']),
  R('deep', ['Always know the right thing to do', 'تعرف دائمًا الصواب'], ['Always have the courage to do it', 'تملك دائمًا الشجاعة لفعله']),
  R('deep', ['Never be able to say goodbye', 'لا تستطيع الوداع أبدًا'], ['Never be able to say sorry', 'لا تستطيع الاعتذار أبدًا']),
  R('deep', ['Be understood by everyone', 'يفهمك الجميع'], ['Understand everyone', 'تفهم الجميع']),
];

export const RATHERS = [
  ...LIGHT_RATHERS,
  ...DEEP_RATHERS.map((r) => ({
    ...r,
    theme: BOND_RATHERS.has(r.choices[0].en) ? 'bonds' : 'deep',
  })),
];

export function drawRather(used, themes) {
  return structuredClone(RATHERS[drawIndex(RATHERS, used, themes)]);
}

/* ------------------------------------------------------------------ */
/* Priorities — rank four items 1–4 (1 = top priority)                  */
/* ------------------------------------------------------------------ */

const P = (en, ar, items) => ({
  category: 'rank',
  text: { en, ar },
  items: items.map(([ien, iar]) => ({ en: ien, ar: iar })),
});

const LIGHT_PRIORITIES = [
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

const DEEP_PRIORITIES = [
  P('Rank what makes a life meaningful', 'رتّب ما يجعل الحياة ذات معنى', [
    ['Love', 'الحب'], ['Purpose', 'الغاية'], ['Freedom', 'الحرية'], ['Inner peace', 'السلام الداخلي'],
  ]),
  P('Rank these values', 'رتّب هذه القيم', [
    ['Honesty', 'الصدق'], ['Kindness', 'اللطف'], ['Loyalty', 'الوفاء'], ['Courage', 'الشجاعة'],
  ]),
  P("Rank what you'd protect first", 'رتّب ما ستحميه أولًا', [
    ['Your health', 'صحتك'], ['Your reputation', 'سمعتك'], ['Your relationships', 'علاقاتك'], ['Your dreams', 'أحلامك'],
  ]),
  P('Rank what matters most in a life partner', 'رتّب الأهم في شريك الحياة', [
    ['Understanding', 'التفهّم'], ['Respect', 'الاحترام'], ['Humor', 'خفة الدم'], ['Ambition', 'الطموح'],
  ]),
  P('Rank what scares you most', 'رتّب أكثر ما يخيفك', [
    ['Being forgotten', 'أن تُنسى'], ['Failing', 'الفشل'], ['Losing someone', 'فقدان شخص عزيز'], ['Wasting my life', 'أن تضيع حياتي'],
  ]),
  P("Rank what you'd want more of", 'رتّب ما تريد المزيد منه', [
    ['Time', 'الوقت'], ['Wisdom', 'الحكمة'], ['Health', 'الصحة'], ['Closeness to people', 'القرب من الناس'],
  ]),
  P('Rank the sources of happiness', 'رتّب مصادر السعادة', [
    ['Achievement', 'الإنجاز'], ['Family', 'العائلة'], ['Faith', 'الإيمان'], ['New experiences', 'التجارب الجديدة'],
  ]),
  P('Rank what defines who you are', 'رتّب ما يحدّد من أنت', [
    ['My choices', 'اختياراتي'], ['My memories', 'ذكرياتي'], ['My values', 'قيمي'], ['My relationships', 'علاقاتي'],
  ]),
  P('Rank what is hardest to forgive', 'رتّب الأصعب في المسامحة', [
    ['Betrayal', 'الخيانة'], ['Lies', 'الكذب'], ['Neglect', 'الإهمال'], ['Disrespect', 'قلة الاحترام'],
  ]),
  P("Rank what you'd give up last", 'رتّب ما ستتخلى عنه أخيرًا', [
    ['Freedom', 'الحرية'], ['Comfort', 'الراحة'], ['Pride', 'الكبرياء'], ['Privacy', 'الخصوصية'],
  ]),
  P('Rank what makes a good leader', 'رتّب ما يصنع القائد الجيد', [
    ['Vision', 'الرؤية'], ['Fairness', 'العدل'], ['Humility', 'التواضع'], ['Decisiveness', 'الحزم'],
  ]),
  P('Rank what a child needs most', 'رتّب ما يحتاجه الطفل أكثر', [
    ['Love', 'الحب'], ['Discipline', 'الانضباط'], ['Freedom', 'الحرية'], ['A good example', 'القدوة'],
  ]),
  P('Rank what makes a friendship deep', 'رتّب ما يجعل الصداقة عميقة', [
    ['Shared history', 'الذكريات المشتركة'], ['Honesty', 'الصراحة'], ['Showing up', 'الحضور وقت الحاجة'], ['Laughing together', 'الضحك معًا'],
  ]),
  P('Rank what you’d want people to say about you', 'رتّب ما تحب أن يقوله الناس عنك', [
    ['They were kind', 'كان لطيفًا'], ['They were brave', 'كان شجاعًا'], ['They were wise', 'كان حكيمًا'], ['They were fun', 'كان ممتعًا'],
  ]),
  P('Rank what makes a home', 'رتّب ما يصنع البيت', [
    ['The people', 'الناس فيه'], ['The memories', 'الذكريات'], ['The place itself', 'المكان نفسه'], ['The feeling of safety', 'الشعور بالأمان'],
  ]),
];

/** Value rankings that are about relationships. */
const BOND_PRIORITY_PREFIXES = [
  'Rank what matters most in a life partner',
  'Rank what is hardest to forgive',
  'Rank what makes a friendship deep',
  'Rank what makes a home',
];

export const PRIORITIES = [
  ...themed('light', LIGHT_PRIORITIES),
  ...DEEP_PRIORITIES.map((p) => ({
    ...p,
    theme: BOND_PRIORITY_PREFIXES.some((x) => p.text.en.startsWith(x)) ? 'bonds' : 'deep',
  })),
];

export function drawPriority(used, themes) {
  return structuredClone(PRIORITIES[drawIndex(PRIORITIES, used, themes)]);
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

const wordSet = (name, words, prompts) => ({
  name,
  kind: 'word',
  prompts,
  make: () =>
    shuffle(words)
      .slice(0, 9)
      .map((w) => ({ display: w })),
});

const LIGHT_TELEPATHY = [
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

const THOUGHTFUL_TELEPATHY = [
  wordSet(
    T('Big ideas', 'أفكار كبرى'),
    [
      T('Freedom', 'حرية'), T('Truth', 'حقيقة'), T('Time', 'وقت'), T('Love', 'حب'),
      T('Home', 'وطن'), T('Silence', 'صمت'), T('Hope', 'أمل'), T('Fate', 'قدر'),
      T('Memory', 'ذاكرة'), T('Change', 'تغيير'), T('Light', 'نور'), T('Soul', 'روح'),
      T('Faith', 'إيمان'), T('Journey', 'رحلة'), T('Peace', 'سلام'), T('Wisdom', 'حكمة'),
    ],
    [
      T('Pick what your relationship is built on', 'اختر ما تقوم عليه علاقتكما'),
      T('Pick the word that matters most to your partner', 'اختر الكلمة الأهم عند شريكك'),
      T('Pick what you are searching for', 'اختر ما تبحث عنه'),
    ],
  ),
  wordSet(
    T('Feelings', 'مشاعر'),
    [
      T('Longing', 'حنين'), T('Calm', 'هدوء'), T('Wonder', 'دهشة'), T('Pride', 'فخر'),
      T('Gratitude', 'امتنان'), T('Doubt', 'شك'), T('Joy', 'فرح'), T('Regret', 'ندم'),
      T('Relief', 'ارتياح'), T('Courage', 'شجاعة'), T('Loneliness', 'وحدة'), T('Belonging', 'انتماء'),
    ],
    [
      T('Pick the feeling your partner knows best', 'اختر الشعور الذي يعرفه شريكك أكثر'),
      T('Pick how this year has felt', 'اختر كيف كانت هذه السنة'),
    ],
  ),
];

const TELEPATHY_SETS = [
  ...themed('light', LIGHT_TELEPATHY),
  { ...THOUGHTFUL_TELEPATHY[0], theme: 'deep' }, // Big ideas
  { ...THOUGHTFUL_TELEPATHY[1], theme: 'bonds' }, // Feelings
];

/** Builds a fresh 3×3 telepathy grid from the selected themes, avoiding recently-used sets. */
export function buildTelepathyGrid(used, themes) {
  const set = TELEPATHY_SETS[drawIndex(TELEPATHY_SETS, used, themes)];
  const text = Math.random() < 0.7 ? pick(set.prompts) : pick(GENERIC_TELEPATHY_PROMPTS);
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

/* ------------------------------------------------------------------ */
/* Bare minimum or princess treatment                                  */
/* Each round shows a handful of things someone might do for you; each */
/* player calls every one "bare minimum" (0) or "princess treatment"   */
/* (1).   princess — couples edition      bestie — friends edition     */
/* Phrased as actions (no he/she) so they read the same for everyone.  */
/* ------------------------------------------------------------------ */

const I = (en, ar) => ({ en, ar });

const PRINCESS_ITEMS = [
  I('Texting “good morning” every day', 'رسالة «صباح الخير» كل يوم'),
  I('Remembering your exact coffee order', 'حفظ طلب قهوتك بالتفصيل'),
  I('Opening the car door for you', 'فتح باب السيارة لك'),
  I('Planning the whole date without being asked', 'التخطيط للموعد كاملًا بدون ما تطلب'),
  I('Sharing their location when out late', 'مشاركة الموقع عند التأخر برا البيت'),
  I('Paying on the first date', 'الدفع في أول موعد'),
  I('Bringing you food when you’re sick', 'جلب الأكل لك وقت المرض'),
  I('Replying within an hour', 'الرد خلال ساعة'),
  I('Posting you on social media', 'نشر صورتكما على السوشال ميديا'),
  I('Remembering your friends’ names', 'تذكّر أسماء أصدقائك'),
  I('“Text me when you get home”', '«طمّني إذا وصلت»'),
  I('Carrying the shopping bags', 'حمل أكياس التسوّق'),
  I('Surprise flowers for no reason', 'ورد مفاجئ بدون مناسبة'),
  I('Defending you when you’re not around', 'الدفاع عنك في غيابك'),
  I('Learning your love language', 'تعلّم لغة الحب الخاصة بك'),
  I('Letting you pick the restaurant', 'ترك اختيار المطعم لك'),
  I('Saving you the last bite', 'ترك آخر لقمة لك'),
  I('Calling instead of texting when it matters', 'الاتصال بدل الرسائل في الأمور المهمة'),
  I('Getting along with your family', 'الانسجام مع أهلك'),
  I('Remembering your anniversary with no reminder', 'تذكّر ذكراكما بدون تنبيه'),
  I('Apologizing first after a fight', 'الاعتذار أولًا بعد الزعل'),
  I('Driving you to the airport at 4 a.m.', 'توصيلك للمطار الساعة 4 الفجر'),
  I('Listening to your rant without trying to fix it', 'سماع فضفضتك بدون محاولة حلّها'),
  I('Handwritten letters', 'رسائل بخط اليد'),
  I('Knowing your shoe size', 'معرفة مقاس حذائك'),
  I('Planning a trip around your interests', 'تخطيط رحلة على كيف اهتماماتك'),
  I('Asking about your day, and actually listening', 'السؤال عن يومك والإنصات فعلًا'),
  I('Saying “I love you” first', 'قول «أحبك» أولًا'),
  I('Giving you the phone charger first', 'إعطاؤك الشاحن أولًا'),
  I('Introducing you to their friends', 'تعريفك على أصدقائهم'),
  I('Cooking dinner after your long day', 'طبخ العشاء بعد يومك الطويل'),
  I('No phone at the dinner table', 'لا جوال على طاولة العشاء'),
  I('Holding your bag while you try things on', 'مسك شنطتك وأنت تجرّب الملابس'),
  I('Matching outfits on purpose', 'تنسيق اللبس معك عن قصد'),
  I('Booking the table before you ask', 'حجز الطاولة قبل ما تطلب'),
  I('Remembering a tiny thing you said months ago', 'تذكّر شيء صغير قلته قبل شهور'),
  I('Waking up early to make you breakfast', 'الصحيان بدري لتحضير فطورك'),
  I('Being on time', 'الالتزام بالموعد'),
  I('Cooling the car down before you get in', 'تشغيل السيارة وتبريدها قبل ما تركب'),
  I('Walking on the traffic side of the pavement', 'المشي من جهة الشارع لحمايتك'),
];

const BESTIE_ITEMS = [
  I('Hyping your selfie in the comments', 'مدح صورتك في التعليقات'),
  I('Remembering your birthday with no reminder', 'تذكّر عيد ميلادك بدون تنبيه'),
  I('Sending memes that remind them of you', 'إرسال ميمز تذكّرهم فيك'),
  I('Holding your stuff while you’re on a ride', 'مسك أغراضك وأنت في اللعبة'),
  I('Driving you home even when it’s out of the way', 'توصيلك للبيت حتى لو مو على طريقهم'),
  I('Telling you there’s food in your teeth', 'تنبيهك إن فيه أكل بين أسنانك'),
  I('Lending you their charger', 'إعطاؤك شاحنهم'),
  I('Answering your voice note with a voice note', 'الرد على فويسك بفويس'),
  I('Showing up to help you move house', 'الحضور لمساعدتك في نقل العفش'),
  I('Keeping your secret', 'حفظ سرّك'),
  I('Paying you back without a reminder', 'رد الفلوس بدون تذكير'),
  I('Taking 50 photos until you like one', 'تصويرك 50 صورة لين تعجبك وحدة'),
  I('Remembering your coffee order', 'حفظ طلب قهوتك'),
  I('Picking up your call at 2 a.m.', 'الرد على اتصالك الساعة 2 الفجر'),
  I('Backing you up in an argument, even when you’re wrong', 'الوقوف معك في النقاش حتى لو كنت غلطان'),
  I('Texting “home safe?” after hanging out', 'سؤال «وصلت؟» بعد الطلعة'),
  I('Inviting you to everything', 'عزيمتك على كل طلعة'),
  I('Actually watching the show you recommended', 'مشاهدة المسلسل اللي رشّحته فعلًا'),
  I('Visiting you in hospital', 'زيارتك في المستشفى'),
  I('Ordering your usual when you’re running late', 'طلب طلبك المعتاد إذا تأخرت'),
  I('Bringing snacks to the sleepover', 'جلب السناكات للسهرة'),
  I('Holding a grudge against whoever hurt you', 'الزعل على اللي زعّلك نيابة عنك'),
  I('Being honest about your outfit', 'الصراحة في رأيهم بلبسك'),
  I('Saving you a seat', 'حجز مكان لك'),
  I('Throwing you a surprise birthday party', 'حفلة عيد ميلاد مفاجئة'),
  I('Remembering your exam or interview day', 'تذكّر يوم اختبارك أو مقابلتك'),
  I('Sharing their fries', 'مشاركتك البطاطس'),
  I('Liking your posts within minutes', 'الإعجاب بمنشوراتك خلال دقائق'),
  I('Coming to your graduation', 'حضور تخرّجك'),
  I('Checking on you when you go quiet', 'السؤال عنك إذا اختفيت'),
  I('Helping you rehearse a hard conversation', 'مساعدتك تتدرّب على محادثة صعبة'),
  I('Planning the group trip', 'تنظيم رحلة الشلّة'),
  I('Making you a playlist', 'عمل قائمة أغاني لك'),
  I('Knowing exactly how you take your tea', 'معرفة شايك بالضبط كيف تحبه'),
  I('Defending you in the group chat', 'الدفاع عنك في القروب'),
  I('Bringing you soup when you’re sick', 'جلب شوربة لك وقت المرض'),
  I('Lending you their clothes', 'إعارتك ملابسهم'),
  I('Remembering your food allergies', 'تذكّر حساسيتك من الأكل'),
  I('Waiting until you’re inside before driving off', 'الانتظار لين تدخل البيت قبل ما يمشون'),
  I('Sending a “thinking of you” text out of nowhere', 'رسالة «تذكرتك» فجأة بدون سبب'),
];

export const TREATMENT_POOLS = Object.freeze({ princess: PRINCESS_ITEMS, bestie: BESTIE_ITEMS });

const TREATMENT_TEXT = {
  princess: { en: 'Bare minimum or princess treatment?', ar: 'أقل الواجب ولا معاملة أميرة؟' },
  bestie: { en: 'Bare minimum or princess treatment? Friends edition', ar: 'أقل الواجب ولا معاملة أميرة؟ نسخة الأصدقاء' },
};

export const TREATMENT_ITEMS_PER_ROUND = 5;

/** Draw a round of statements for `edition` ('princess' | 'bestie') without repeating recent ones. */
export function drawTreatment(edition, used, count = TREATMENT_ITEMS_PER_ROUND) {
  const items = TREATMENT_POOLS[edition];
  let available = items.map((_, i) => i).filter((i) => !used.has(i));
  if (available.length < count) {
    used.clear();
    available = items.map((_, i) => i);
  }
  const chosen = shuffle(available).slice(0, count);
  for (const i of chosen) used.add(i);
  return {
    prompt: { category: edition, text: structuredClone(TREATMENT_TEXT[edition]) },
    items: chosen.map((i) => structuredClone(items[i])),
  };
}
