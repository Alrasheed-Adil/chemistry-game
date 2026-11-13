/**
 * Avatar catalog shared by the server (validates ids, hands out defaults) and
 * the client (renders + picker). Every avatar is an original parody built from
 * emoji with a pun name, a nod to a famous face, never a likeness or official art.
 *
 *   id     stable key stored on the player
 *   e      main emoji
 *   b      optional accessory badge (shown on larger sizes)
 *   en/ar  display names
 */

export const AVATAR_GROUPS = Object.freeze(['screen', 'stage', 'heroes', 'anime', 'lab']);

const A = (group, id, e, b, en, ar) => ({ group, id, e, b, en, ar });

export const AVATARS = Object.freeze([
  // Screen legends
  A('screen', 'keanu-leaves', '🍃', '🕶️', 'Keanu Leaves', 'كيانو ليفز'),
  A('screen', 'leo-dicappuccino', '☕', '🎩', 'Leonardo DiCappuccino', 'ليوناردو دي كابتشينو'),
  A('screen', 'arnold-schwarzenburger', '🍔', '💪', 'Arnold Schwarzenburger', 'أرنولد شوارزنبرجر'),
  A('screen', 'tom-cruise-ship', '🛳️', '😎', 'Tom Cruise Ship', 'توم كروز السفينة'),
  A('screen', 'brad-pitt-stop', '🏎️', null, 'Brad Pitt Stop', 'براد بِت ستوب'),
  A('screen', 'morgan-freezeman', '🥶', '🎙️', 'Morgan Freezeman', 'مورغان فريزمان'),
  A('screen', 'nicolas-cabbage', '🥬', null, 'Nicolas Cabbage', 'نيكولاس كابيج'),
  A('screen', 'jim-curry', '🍛', '🤪', 'Jim Curry', 'جيم كاري بالدجاج'),
  A('screen', 'dwayne-the-rocket', '🚀', '🤨', 'Dwayne “The Rocket”', 'دواين «ذا روكيت»'),
  A('screen', 'johnny-deep-sea', '🐙', '🏴‍☠️', 'Johnny Deep Sea', 'جوني ديب البحر'),
  A('screen', 'vin-diesel-pump', '⛽', null, 'Vin Diesel Pump', 'فين ديزل… بنزين؟'),
  A('screen', 'mr-bean-bag', '🫘', null, 'Mr. Bean Bag', 'مستر فول'),
  A('screen', 'samuel-l-jacksnack', '🍿', null, 'Samuel L. Jacksnack', 'صامويل ل. جاك-سناك'),
  A('screen', 'will-swim', '🏊', null, 'Will Swim', 'ويل سويم'),

  // Pop stars
  A('stage', 'ed-shearin', '🐑', '✂️', 'Ed Shearin’', 'إد شيرين الخروف'),
  A('stage', 'taylor-thrift', '🛍️', null, 'Taylor Thrift', 'تايلور ثريفت'),
  A('stage', 'bruno-mars-bar', '🍫', '🪐', 'Bruno Mars Bar', 'برونو مارس بار'),
  A('stage', 'billie-eyelash', '👁️', null, 'Billie Eyelash', 'بيلي آيلاش'),
  A('stage', 'ariana-venti', '🧋', null, 'Ariana Venti', 'أريانا فِنتي'),
  A('stage', 'justin-beaver', '🦫', null, 'Justin Beaver', 'جاستن القندس'),
  A('stage', 'drake-the-duck', '🦆', null, 'Drake the Duck', 'دريك البطّ'),
  A('stage', 'bee-yonce', '🐝', '👑', 'Bee-yoncé', 'بي-يونسيه'),
  A('stage', 'the-weekend', '🛋️', null, 'The Weekend', 'ذا ويك إند'),
  A('stage', 'ri-banana', '🍌', null, 'Ri-banana', 'ري-بنانا'),
  A('stage', 'freddie-thermometer', '🌡️', '🎤', 'Freddie Thermometer', 'فريدي ثيرمومتر'),
  A('stage', 'elvis-pretzley', '🥨', null, 'Elvis Pretzley', 'إلفيس بريتزلي'),
  A('stage', 'shake-ira', '🥤', '💃', 'Shake-ira', 'ميلك شاكيرا'),
  A('stage', 'lady-googoo', '👶', '⚡', 'Lady Googoo', 'ليدي غوغو'),
  A('stage', 'amr-kebab', '🥙', null, 'Amr Kebab', 'عمرو كباب'),
  A('stage', 'kadim-al-sahran', '🌙', '😴', 'Kadim Al-Sahran', 'كاظم السهران'),

  // Movie heroes
  A('heroes', 'bathman', '🛁', '🦇', 'Bathman', 'رجل الحمّام'),
  A('heroes', 'souperman', '🍲', null, 'Souperman', 'شوربمان'),
  A('heroes', 'ironing-man', '👔', '♨️', 'Ironing Man', 'رجل المكواة'),
  A('heroes', 'spider-mom', '🕷️', '🧺', 'Spider-Mom', 'سبايدر ماما'),
  A('heroes', 'sore-thor', '🔨', '🩹', 'Sore Thor', 'ثور المتألم'),
  A('heroes', 'wander-woman', '🧭', null, 'Wander Woman', 'المرأة التائهة'),
  A('heroes', 'darth-waiter', '🍽️', null, 'Darth Waiter', 'دارث النادل'),
  A('heroes', 'hairy-potter', '🏺', '⚡', 'Hairy Potter', 'هاري الفخّاري'),
  A('heroes', 'gandalf-the-beige', '🧙', null, 'Gandalf the Beige', 'غاندالف البيج'),
  A('heroes', 'indiana-phones', '📱', '🤠', 'Indiana Phones', 'إنديانا فونز'),
  A('heroes', 'james-bun', '🥯', '🍸', 'Bond, James Bun', 'بَن، جيمس بَن'),
  A('heroes', 'the-jogger', '🏃', '🃏', 'The Jogger', 'ذا جوغر'),
  A('heroes', 'the-germinator', '🌱', '🕶️', 'The Germinator', 'ذا جيرميناتور'),
  A('heroes', 'rocky-road', '🍨', '🥊', 'Rocky Road', 'روكي رود'),
  A('heroes', 'sherlock-homes', '🏠', '🔍', 'Sherlock Homes, Realtor', 'شيرلوك هومز العقاري'),

  // Anime
  A('anime', 'na-ramen-to', '🍜', '🍥', 'Na-ramen-to', 'نا-رامن-تو'),
  A('anime', 'vege-table', '🥦', null, 'Vege-table', 'خُضَريتا'),
  A('anime', 'sai-tomato', '🍅', null, 'Sai-tomato', 'سايتوماتو'),
  A('anime', 'potato-ro', '🥔', '🌂', 'Potato-ro', 'بطاطورو'),
  A('anime', 'tailor-moon', '🧵', '🌙', 'Tailor Moon', 'خيّاطة القمر'),
  A('anime', 'pika-choo-choo', '🚂', '⚡', 'Pika-Choo-Choo', 'بيكا-تشو تشو'),
  A('anime', 'monkey-d-loafy', '🍞', '👒', 'Monkey D. Loafy', 'مونكي دي. رغيف'),
  A('anime', 'go-snore', '😴', '💤', 'Go-snore', 'غوجو النعسان'),
  A('anime', 'errand-yeager', '🛒', null, 'Errand Yeager', 'إرين المشاوير'),
  A('anime', 'levis', '👖', null, 'Levi’s', 'ليفاي جينز'),
  A('anime', 'dora-lemon', '🍋', '🔔', 'Dora-lemon', 'دورا-ليمون'),
  A('anime', 'detective-corn-an', '🌽', '🔍', 'Detective Corn-an', 'المحقق كورنان'),
  A('anime', 'grind-izer', '⚙️', '☕', 'Grind-izer', 'مطحنايزر'),
  A('anime', 'tan-jello', '🍮', null, 'Tan-jello', 'تانجيلو'),
  A('anime', 'go-cook-u', '🍳', null, 'Go-cook-u', 'غوكو الطبّاخ'),

  // Lab legends
  A('lab', 'albert-onestone', '🪨', '💡', 'Albert One-Stone', 'ألبرت حجر-واحد'),
  A('lab', 'isaac-fig-newton', '🍎', '🍪', 'Isaac Fig Newton', 'إسحاق نيو-تين'),
  A('lab', 'marie-curie-ous', '🧐', '⚗️', 'Marie Curie-ous', 'ماري الفضولية'),
  A('lab', 'nikola-tesla-coil', '⚡', '💇', 'Nikola Tesla Coil', 'نيكولا تسلا كويل'),
  A('lab', 'ibn-sinabon', '🧁', null, 'Ibn Sina-bon', 'ابن سينابون'),
  A('lab', 'charles-darwink', '😉', '🐢', 'Charles Dar-wink', 'تشارلز دار-وينك'),
  A('lab', 'schrodingers-catnap', '🐈', '📦', 'Schrödinger’s Catnap', 'قطة شرودنغر النائمة'),
  A('lab', 'pavlovs-hot-dog', '🌭', '🔔', 'Pavlov’s Hot Dog', 'كلب بافلوف الساخن'),
  A('lab', 'galile-yo-yo', '🪀', '🔭', 'Galile-yo-yo', 'غاليلي-يويو'),
]);

export const AVATAR_BY_ID = Object.freeze(Object.fromEntries(AVATARS.map((a) => [a.id, a])));
