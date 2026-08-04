const OnboardingConfig = require('../models/OnboardingConfig');

const DEFAULT_ONBOARDING_CONFIG = {
  segments: [
    {
      id: "sports_fitness",
      name: "Sports & Fitness",
      interests: [
        { id: "football", label: "Football", emoji: "⚽" },
        { id: "cricket", label: "Cricket", emoji: "🏏" },
        { id: "basketball", label: "Basketball", emoji: "🏀" },
        { id: "badminton", label: "Badminton", emoji: "🏸" },
        { id: "tennis", label: "Tennis", emoji: "🎾" },
        { id: "golf", label: "Golf", emoji: "⛳" },
        { id: "swimming", label: "Swimming", emoji: "🏊" },
        { id: "running", label: "Running", emoji: "🏃" },
        { id: "cycling", label: "Cycling", emoji: "🚴" },
        { id: "gym_workout", label: "Gym & Workout", emoji: "🏋️" },
        { id: "yoga", label: "Yoga", emoji: "🧘" },
        { id: "martial_arts", label: "Martial Arts", emoji: "🥋" },
        { id: "boxing", label: "Boxing", emoji: "🥊" },
        { id: "skateboarding", label: "Skateboarding", emoji: "🛹" },
        { id: "rock_climbing", label: "Rock Climbing", emoji: "🧗" }
      ]
    },
    {
      id: "arts_creativity",
      name: "Arts & Creativity",
      interests: [
        { id: "drawing", label: "Drawing", emoji: "✏️" },
        { id: "sketching", label: "Sketching", emoji: "🖊️" },
        { id: "painting", label: "Painting", emoji: "🎨" },
        { id: "photography", label: "Photography", emoji: "📷" },
        { id: "graphic_design", label: "Graphic Design", emoji: "🖌️" },
        { id: "calligraphy", label: "Calligraphy", emoji: "✒️" },
        { id: "pottery", label: "Pottery", emoji: "🏺" },
        { id: "sculpting", label: "Sculpting", emoji: "🗿" },
        { id: "creative_writing", label: "Creative Writing", emoji: "📝" },
        { id: "poetry", label: "Poetry", emoji: "🖋️" },
        { id: "diy_crafts", label: "DIY Crafts", emoji: "✂️" },
        { id: "fashion_design", label: "Fashion Design", emoji: "🧵" }
      ]
    },
    {
      id: "music_performing_arts",
      name: "Music & Performing Arts",
      interests: [
        { id: "singing", label: "Singing", emoji: "🎤" },
        { id: "playing_guitar", label: "Playing Guitar", emoji: "🎸" },
        { id: "playing_piano", label: "Playing Piano", emoji: "🎹" },
        { id: "playing_drums", label: "Playing Drums", emoji: "🥁" },
        { id: "dj_ing", label: "DJing", emoji: "🎧" },
        { id: "music_production", label: "Music Production", emoji: "🎚️" },
        { id: "dancing", label: "Dancing", emoji: "💃" },
        { id: "classical_dance", label: "Classical Dance", emoji: "🩰" },
        { id: "theatre_acting", label: "Theatre & Acting", emoji: "🎭" },
        { id: "stand_up_comedy", label: "Stand-up Comedy", emoji: "🎙️" },
        { id: "concerts", label: "Going to Concerts", emoji: "🎶" }
      ]
    },
    {
      id: "food_drink",
      name: "Food & Drink",
      interests: [
        { id: "cooking", label: "Cooking", emoji: "🍳" },
        { id: "baking", label: "Baking", emoji: "🧁" },
        { id: "coffee", label: "Coffee", emoji: "☕" },
        { id: "wine_tasting", label: "Wine Tasting", emoji: "🍷" },
        { id: "street_food", label: "Street Food", emoji: "🌮" },
        { id: "foodie_exploring", label: "Foodie / Trying New Restaurants", emoji: "🍽️" },
        { id: "mixology", label: "Mixology / Cocktails", emoji: "🍸" },
        { id: "vegan_cooking", label: "Vegan Cooking", emoji: "🥗" },
        { id: "grilling_bbq", label: "Grilling & BBQ", emoji: "🍖" },
        { id: "tea_culture", label: "Tea Culture", emoji: "🍵" }
      ]
    },
    {
      id: "travel_outdoors",
      name: "Travel & Outdoors",
      interests: [
        { id: "traveling", label: "Traveling", emoji: "✈️" },
        { id: "backpacking", label: "Backpacking", emoji: "🎒" },
        { id: "road_trips", label: "Road Trips", emoji: "🚗" },
        { id: "hiking", label: "Hiking", emoji: "🥾" },
        { id: "camping", label: "Camping", emoji: "🏕️" },
        { id: "beach_days", label: "Beach Days", emoji: "🏖️" },
        { id: "adventure_sports", label: "Adventure Sports", emoji: "🪂" },
        { id: "scuba_diving", label: "Scuba Diving", emoji: "🤿" },
        { id: "stargazing", label: "Stargazing", emoji: "🌌" },
        { id: "nature_walks", label: "Nature Walks", emoji: "🌳" },
        { id: "gardening", label: "Gardening", emoji: "🪴" }
      ]
    },
    {
      id: "entertainment_media",
      name: "Entertainment & Media",
      interests: [
        { id: "watching_movies", label: "Watching Movies", emoji: "🎬" },
        { id: "watching_series", label: "Watching Series", emoji: "📺" },
        { id: "anime", label: "Anime", emoji: "🍥" },
        { id: "kdrama", label: "K-Drama", emoji: "🎞️" },
        { id: "stand_up_specials", label: "Comedy Specials", emoji: "😂" },
        { id: "podcasts", label: "Podcasts", emoji: "🎙️" },
        { id: "true_crime", label: "True Crime", emoji: "🔍" },
        { id: "documentaries", label: "Documentaries", emoji: "🎥" },
        { id: "reality_tv", label: "Reality TV", emoji: "📡" },
        { id: "sports_watching", label: "Watching Live Sports", emoji: "🏟️" }
      ]
    },
    {
      id: "gaming_tech",
      name: "Gaming & Tech",
      interests: [
        { id: "video_games", label: "Video Games", emoji: "🎮" },
        { id: "pc_gaming", label: "PC Gaming", emoji: "🖥️" },
        { id: "mobile_gaming", label: "Mobile Gaming", emoji: "📱" },
        { id: "board_games", label: "Board Games", emoji: "🎲" },
        { id: "card_games", label: "Card Games", emoji: "🃏" },
        { id: "chess", label: "Chess", emoji: "♟️" },
        { id: "esports", label: "Esports", emoji: "🕹️" },
        { id: "coding", label: "Coding / Programming", emoji: "💻" },
        { id: "gadgets_tech", label: "Gadgets & Tech", emoji: "🔌" },
        { id: "ai_ml", label: "AI & Machine Learning", emoji: "🤖" }
      ]
    },
    {
      id: "reading_learning",
      name: "Reading & Learning",
      interests: [
        { id: "reading_books", label: "Reading Books", emoji: "📚" },
        { id: "fiction", label: "Fiction", emoji: "📖" },
        { id: "self_help", label: "Self-Help Books", emoji: "🧠" },
        { id: "comics_manga", label: "Comics & Manga", emoji: "📗" },
        { id: "philosophy", label: "Philosophy", emoji: "🏛️" },
        { id: "history", label: "History", emoji: "📜" },
        { id: "languages", label: "Learning New Languages", emoji: "🗣️" },
        { id: "science", label: "Science", emoji: "🔬" },
        { id: "astrology", label: "Astrology", emoji: "🔮" },
        { id: "finance_investing", label: "Finance & Investing", emoji: "📈" }
      ]
    },
    {
      id: "wellness_mindfulness",
      name: "Wellness & Mindfulness",
      interests: [
        { id: "meditation", label: "Meditation", emoji: "🧘‍♀️" },
        { id: "journaling", label: "Journaling", emoji: "📓" },
        { id: "mental_health_advocacy", label: "Mental Health Advocacy", emoji: "💚" },
        { id: "spirituality", label: "Spirituality", emoji: "🕉️" },
        { id: "nutrition", label: "Nutrition", emoji: "🥑" },
        { id: "sleep_wellness", label: "Sleep & Recovery", emoji: "😴" },
        { id: "minimalism", label: "Minimalism", emoji: "🕊️" },
        { id: "volunteering", label: "Volunteering", emoji: "🤝" }
      ]
    },
    {
      id: "pets_animals",
      name: "Pets & Animals",
      interests: [
        { id: "dog_lover", label: "Dog Lover", emoji: "🐶" },
        { id: "cat_lover", label: "Cat Lover", emoji: "🐱" },
        { id: "bird_watching", label: "Bird Watching", emoji: "🐦" },
        { id: "aquarium_fish", label: "Aquarium / Fish Keeping", emoji: "🐠" },
        { id: "horse_riding", label: "Horse Riding", emoji: "🐴" },
        { id: "animal_rescue", label: "Animal Rescue & Adoption", emoji: "🐾" }
      ]
    },
    {
      id: "lifestyle_social",
      name: "Lifestyle & Social",
      interests: [
        { id: "fashion", label: "Fashion", emoji: "👗" },
        { id: "makeup_beauty", label: "Makeup & Beauty", emoji: "💄" },
        { id: "cars_bikes", label: "Cars & Bikes", emoji: "🏍️" },
        { id: "clubbing_nightlife", label: "Clubbing & Nightlife", emoji: "🪩" },
        { id: "socializing_friends", label: "Hanging Out with Friends", emoji: "👯" },
        { id: "networking", label: "Networking & Entrepreneurship", emoji: "💼" },
        { id: "home_decor", label: "Home Decor & Interior Design", emoji: "🛋️" },
        { id: "collecting", label: "Collecting (Stamps, Coins, etc.)", emoji: "🪙" },
        { id: "astrology_tarot", label: "Tarot & Card Reading", emoji: "🃏" },
        { id: "party_planning", label: "Party Planning", emoji: "🎉" }
      ]
    }
  ],
  sections: [
    {
      id: "questions",
      name: "Questions",
      description: "A direct question the user answers in their own words.",
      prompts: [
        { id: "q01", text: "What's a random skill you're weirdly proud of?" },
        { id: "q02", text: "What's the most spontaneous thing you've ever done?" },
        { id: "q03", text: "What's your go-to karaoke song?" },
        { id: "q04", text: "What's a non-negotiable on a first date?" },
        { id: "q05", text: "What's the best trip you've ever taken?" },
        { id: "q06", text: "What would your friends say is your most annoying habit?" },
        { id: "q07", text: "What's a hill you're willing to die on?" },
        { id: "q08", text: "What's your simple pleasure?" },
        { id: "q09", text: "What's the last thing that made you laugh out loud?" },
        { id: "q10", text: "What's a book, show, or movie that changed how you see things?" },
        { id: "q11", text: "What's your order at a coffee shop, and does it say something about you?" },
        { id: "q12", text: "What's the most useless talent you have?" },
        { id: "q13", text: "What's something you're currently learning or trying to get better at?" },
        { id: "q14", text: "What's a food combination you love that others find questionable?" },
        { id: "q15", text: "What's your idea of a perfect Sunday?" },
        { id: "q16", text: "What's the boldest thing on your bucket list?" },
        { id: "q17", text: "What's a topic you could talk about for hours?" },
        { id: "q18", text: "What's your love language, and how do you show it?" },
        { id: "q19", text: "What's a small thing that instantly improves your day?" },
        { id: "q20", text: "What's the weirdest compliment you've ever received?" },
        { id: "q21", text: "What's a rule you think everyone should follow on a date?" },
        { id: "q22", text: "What's something you've changed your mind about recently?" }
      ]
    },
    {
      id: "statements",
      name: "Statement Completions",
      description: "A half-written sentence the user completes; both halves show on the profile.",
      prompts: [
        { id: "s01", text: "Dating me is like..." },
        { id: "s02", text: "The way to win me over is..." },
        { id: "s03", text: "I'll fall for you if..." },
        { id: "s04", text: "My most controversial opinion is..." },
        { id: "s05", text: "I get way too competitive about..." },
        { id: "s06", text: "My friends would describe me as..." },
        { id: "s07", text: "I'm looking for someone who..." },
        { id: "s08", text: "A perfect first date for me looks like..." },
        { id: "s09", text: "I'll never turn down..." },
        { id: "s10", text: "The quickest way to make me laugh is..." },
        { id: "s11", text: "I'm currently obsessed with..." },
        { id: "s12", text: "I take way too long deciding..." },
        { id: "s13", text: "Two truths and a lie about me:" },
        { id: "s14", text: "A life goal of mine is..." },
        { id: "s15", text: "I geek out on..." },
        { id: "s16", text: "Together, we could..." },
        { id: "s17", text: "The key to my heart is..." },
        { id: "s18", text: "I overthink..." },
        { id: "s19", text: "My most irrational fear is..." },
        { id: "s20", text: "The last time I cried happy tears was..." },
        { id: "s21", text: "I'm the type of person who always..." },
        { id: "s22", text: "My love language, decoded:" }
      ]
    },
    {
      id: "flags_and_quirks",
      name: "Flags & Quirks",
      description: "Punchy, personality-driven prompts covering red flags, green flags, and quirks.",
      prompts: [
        { id: "f01", text: "My biggest red flag is..." },
        { id: "f02", text: "My biggest green flag is..." },
        { id: "f03", text: "A green flag I look for in a partner is..." },
        { id: "f04", text: "A red flag I always ignore (but shouldn't) is..." },
        { id: "f05", text: "My toxic trait is..." },
        { id: "f06", text: "The one thing that's an instant deal-breaker for me is..." },
        { id: "f07", text: "My beige flag (weirdly neutral quirk) is..." },
        { id: "f08", text: "I'm secretly very good at..." },
        { id: "f09", text: "My love language toxic version is..." },
        { id: "f10", text: "I will absolutely judge you if you..." },
        { id: "f11", text: "The green flag nobody notices about me is..." },
        { id: "f12", text: "My ick is..." },
        { id: "f13", text: "I peaked when..." },
        { id: "f14", text: "My chaotic side comes out when..." },
        { id: "f15", text: "The most 'me' purchase I've ever made is..." },
        { id: "f16", text: "I will fight you over this opinion:" },
        { id: "f17", text: "My biggest ex-factor (thing my ex hated) is..." },
        { id: "f18", text: "A green flag: I always..." },
        { id: "f19", text: "My love language is words of affirmation, but my actual behavior is..." },
        { id: "f20", text: "The last text I sent that I immediately regretted was about..." },
        { id: "f21", text: "My unpopular dating opinion is..." },
        { id: "f22", text: "You'll know I like you if I..." }
      ]
    }
  ]
};

const redis = require('./redis');

async function getOrInitOnboardingConfig() {
  try {
    const cachedConfig = await redis.get('config:onboarding');
    if (cachedConfig) {
      try {
        return typeof cachedConfig === 'string' ? JSON.parse(cachedConfig) : cachedConfig;
      } catch (e) {
        // Fallback to DB fetch if parse fails
      }
    }

    let config = await OnboardingConfig.findOne({ key: 'default_onboarding_config' }).lean();
    if (!config) {
      config = new OnboardingConfig({
        key: 'default_onboarding_config',
        segments: DEFAULT_ONBOARDING_CONFIG.segments,
        sections: DEFAULT_ONBOARDING_CONFIG.sections
      });
      await config.save();
      config = config.toObject();
    }

    await redis.set('config:onboarding', JSON.stringify(config), { EX: 3600 }).catch(() => {});
    return config;
  } catch (err) {
    console.error('[ONBOARDING CONFIG FETCH ERROR]:', err);
    return DEFAULT_ONBOARDING_CONFIG;
  }
}

// Helper to normalize user interests array
function formatUserInterests(rawInterests, config) {
  if (!Array.isArray(rawInterests)) return [];
  const segments = config?.segments || DEFAULT_ONBOARDING_CONFIG.segments;

  const interestMap = new Map();
  segments.forEach(seg => {
    if (Array.isArray(seg.interests)) {
      seg.interests.forEach(item => {
        interestMap.set(item.id, {
          segmentId: seg.id,
          interestId: item.id,
          label: item.label,
          emoji: item.emoji || ''
        });
      });
    }
  });

  return rawInterests.map(item => {
    if (typeof item === 'string') {
      return interestMap.get(item) || { segmentId: 'custom', interestId: item, label: item, emoji: '✨' };
    }
    if (typeof item === 'object' && item !== null) {
      const match = interestMap.get(item.interestId || item.id);
      return {
        segmentId: item.segmentId || match?.segmentId || 'custom',
        interestId: item.interestId || item.id || 'custom',
        label: item.label || match?.label || String(item.interestId || item.id),
        emoji: item.emoji || match?.emoji || '✨'
      };
    }
    return null;
  }).filter(Boolean);
}

// Helper to normalize user prompts array
function formatUserPrompts(rawPrompts, config) {
  if (!Array.isArray(rawPrompts)) return [];
  const sections = config?.sections || DEFAULT_ONBOARDING_CONFIG.sections;

  const promptMap = new Map();
  sections.forEach(sec => {
    if (Array.isArray(sec.prompts)) {
      sec.prompts.forEach(p => {
        promptMap.set(p.id, {
          sectionId: sec.id,
          promptId: p.id,
          question: p.text
        });
      });
    }
  });

  return rawPrompts.map(item => {
    if (typeof item === 'object' && item !== null) {
      const promptId = item.promptId || item.id;
      const answer = item.answer || item.text;
      if (!promptId || !answer) return null;

      const match = promptMap.get(promptId);
      return {
        promptId,
        sectionId: item.sectionId || match?.sectionId || 'custom',
        question: item.question || match?.question || 'Question',
        answer: String(answer).trim()
      };
    }
    return null;
  }).filter(Boolean);
}

module.exports = {
  DEFAULT_ONBOARDING_CONFIG,
  getOrInitOnboardingConfig,
  formatUserInterests,
  formatUserPrompts
};
