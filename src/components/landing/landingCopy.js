/**
 * landingCopy.js — All landing-page copy, EN + Roman-Hindi (bolchaal).
 * Consumed via useI18n().lang. Roman Hindi only, NEVER Devanagari.
 *
 * Voices are NOT surfaced here — they're mood/age-linked and automatic
 * (no voice menu). The "it adapts" message lives in `explore` (age + mood
 * only; no theme-browse row — kept clean per the "automatic" message).
 *
 * `premium` is the ONLY purchase-surface copy; it renders only when the
 * request is non-native (gated in LandingPage via the nativeRequest prop).
 * Download (`download`/`hero.orGetApp`) is NOT a purchase surface and
 * always renders.
 *
 * Testimonials (parents.q1/q2) are labeled illustrative (parents.illustrative)
 * — composites, not fabricated named endorsements. Swap in real/permissioned
 * quotes if/when available.
 */

export const LANDING_COPY = {
  en: {
    nav: {
      howItWorks: 'How It Works',
      about: 'About',
      blog: 'Blog',
      radio: 'Radio',
      getStarted: 'Get Started',
    },
    hero: {
      h1: 'Bedtime stories designed to help kids fall asleep.',
      sub: 'A new AI bedtime story every night — with calming narration, original music, and living art that guides your child to sleep.',
      cta1: 'Try a story tonight — free',
      cta2: 'See how it works ↓',
      orGetApp: 'or get the app',
    },
    problem: {
      lead: "Bedtime shouldn't be a battle.",
      body: 'But for millions of families, it is — the stalling, the negotiations, the tears. What if the story itself could do the work?',
    },
    how: {
      title: 'How Dream Valley Works',
      p1Title: 'A new story, every night',
      p1Body: 'Fresh, original stories every day — adventures, fairy tales, ocean journeys, and more. Your child never hears the same one twice, and never runs out the way a recorded library does.',
      p2Title: 'Real narration. Original music.',
      p2Body: 'Every story is read in a calming voice, over music written just for it.',
      p3Title: 'Designed to guide your child to sleep',
      p3Body: "Every story moves through three phases — engaging first, then slowing the narration, dimming the art, and quieting the music to match your child's mood and ease them toward sleep. Warm visuals, no ads, no autoplay — unlike the screens that fight it.",
      phaseEngage: 'Engage',
      phaseDescend: 'Descend',
      phaseSleep: 'Sleep',
    },
    art: {
      title: 'Art that winds down with the story',
      lead: 'Every cover is a living scene — its motion, light, and color all ease toward sleep.',
      phase1Label: 'Alive',
      phase1: 'Water flows, fireflies glow — bright, warm, full of motion.',
      phase2Label: 'Winding down',
      phase2: 'Motion slows, the light dims, the colors warm down.',
      phase3Label: 'Still',
      phase3: 'The scene settles — quiet, dark, almost motionless. Time to sleep.',
      mechanism: 'Warm, dimming, slowing visuals protect melatonin and cue rest — what your child sees winds down toward sleep, alongside the voice and the music.',
    },
    listen: {
      title: 'Listen now — no signup needed',
      sub: 'A story and a lullaby. Just press play.',
      endedQ: 'Want to hear more?',
      endedCta: 'Explore free',
      cta: 'Explore all stories — free',
      playAria: 'Play preview',
      pauseAria: 'Pause preview',
    },
    parents: {
      title: 'What Parents Say',
      q1: 'My daughter used to fight bedtime for 45 minutes. Now she asks for her Dream Valley story — and I get my evenings back.',
      q1Author: '— Sarah, parent of a 4-year-old',
      q2: 'I was making up stories with ChatGPT every night. This is that — but with real narration, music, and the most beautiful art. My son is obsessed.',
      q2Author: '— James, parent of a 5-year-old',
      illustrative: 'Illustrative — based on common feedback from parents.',
    },
    explore: {
      title: 'Made for your child, automatically',
      lead: 'No menus, no settings — Dream Valley picks the right story and voice for your child’s age and how they feel tonight.',
      byAge: 'By age',
      byMood: 'By mood',
      moodExplainer: 'A wired child needs a different story than an anxious one.',
    },
    premium: {
      title: 'Dream Valley Premium',
      line: 'Unlock everything — voice cloning, more kid profiles, and your full saved library.',
      cta: 'See plans',
    },
    download: {
      bandTitle: 'Take Dream Valley anywhere',
    },
    finalCta: {
      title: "Tonight's story is waiting.",
      sub: 'A new adventure every night — calming voices, original music, and art that guides your child to sleep.',
      cta: 'Start free tonight',
      noCard: 'No credit card required. Free stories every night.',
      getApp: 'Get the app',
    },
    footer: {
      tagline: 'Magical bedtime stories for kids',
      colProduct: 'Product',
      colApp: 'Get the App',
      colListen: 'Listen',
      colLegal: 'Legal',
      lkHowItWorks: 'How It Works',
      lkAbout: 'About',
      lkBlog: 'Blog',
      lkContact: 'Contact',
      lkIos: 'iOS App Store',
      lkPlay: 'Google Play',
      lkRadio: 'Dream Valley Radio',
      lkPrivacy: 'Privacy Policy',
      lkTerms: 'Terms of Service',
      trust: 'Dream Valley uses AI to generate stories, narration, music, and art. Content is reviewed for age-appropriateness and safety.',
      rights: 'All rights reserved.',
    },
    typeBadge: { story: 'Story', song: 'Lullaby', long_story: 'Story' },
  },

  hi: {
    nav: {
      howItWorks: 'Kaise Kaam Karta Hai',
      about: 'Hamaare Baare Mein',
      blog: 'Blog',
      radio: 'Radio',
      getStarted: 'Shuru Karein',
    },
    hero: {
      h1: 'Aisi bedtime kahaniyaan jo bachhon ko sone mein madad karein.',
      sub: 'Har raat ek nayi AI kahani — shaant awaaz, original music, aur zinda art jo bachhe ko neend tak le jaaye.',
      cta1: 'Aaj raat ek kahani try karein — free',
      cta2: 'Dekhein kaise kaam karta hai ↓',
      orGetApp: 'ya app download karein',
    },
    problem: {
      lead: 'Bedtime ek jang nahi honi chahiye.',
      body: 'Par laakhon families ke liye, ye hai — taalmatol, mol-bhaav, aansoo. Kya ho agar kahani khud ye kaam kar de?',
    },
    how: {
      title: 'Dream Valley kaise kaam karta hai',
      p1Title: 'Har raat ek nayi kahani',
      p1Body: 'Har din nayi, original kahaniyaan — adventures, pari kathayein, samundar ke safar, aur bahut kuch. Bachcha kabhi ek hi kahani do baar nahi sunta, aur recorded library ki tarah kahaniyaan kabhi khatam nahi hotin.',
      p2Title: 'Asli narration. Original music.',
      p2Body: 'Har kahani shaant awaaz mein sunai jaati hai, uske apne music ke saath.',
      p3Title: 'Bachhe ko neend tak le jaane ke liye banayi gayi',
      p3Body: 'Har kahani teen phases mein chalti hai — pehle dhyaan khinchti hai, phir narration, art aur music shaant ho jaate hain — mood ke hisaab se neend ki taraf. Warm visuals, koi ads nahi, koi autoplay nahi — un screens ke ulat jo neend se ladti hain.',
      phaseEngage: 'Shuruaat',
      phaseDescend: 'Utaar',
      phaseSleep: 'Neend',
    },
    art: {
      title: 'Aisi art jo kahani ke saath shaant ho jaaye',
      lead: 'Har cover ek zinda scene hai — iski motion, roshni aur rang sab neend ki taraf badhte hain.',
      phase1Label: 'Zinda',
      phase1: 'Paani behta hai, jugnu chamakte hain — chamkeela, warm, motion se bhara.',
      phase2Label: 'Dheere hota hua',
      phase2: 'Motion dheemi hoti hai, roshni mand padti hai, rang warm-down hote hain.',
      phase3Label: 'Shaant',
      phase3: 'Scene tham jaata hai — khamosh, andhera, lagbhag bina hile. Sone ka time.',
      mechanism: 'Warm, mand padti visuals melatonin bachati hain aur aaram ka ishaara deti hain — bachcha jo dekhe woh bhi neend ki taraf jaaye, awaaz aur music ke saath.',
    },
    listen: {
      title: 'Abhi suniye — koi signup nahi chahiye',
      sub: 'Ek kahani aur ek lori. Bas play dabaaiye.',
      endedQ: 'Aur sunna chahte hain?',
      endedCta: 'Free mein explore karein',
      cta: 'Saari kahaniyaan dekhein — free',
      playAria: 'Preview chalaayein',
      pauseAria: 'Preview rokein',
    },
    parents: {
      title: 'Parents kya kehte hain',
      q1: 'Meri beti pehle 45 minute tak sone se ladti thi. Ab woh khud apni Dream Valley kahani maangti hai — aur mujhe meri shaamein wapas mil gayi hain.',
      q1Author: '— Sarah, 4 saal ki bachhi ki parent',
      q2: 'Main har raat ChatGPT se kahaniyaan banaata tha. Ye wahi hai — par asli narration, music, aur sabse khoobsurat art ke saath. Mera beta iska deewana hai.',
      q2Author: '— James, 5 saal ke bachhe ke parent',
      illustrative: 'Udaharan ke liye — parents ke aam feedback par aadharit.',
    },
    explore: {
      title: 'Aapke bachhe ke liye, apne aap',
      lead: 'Koi menu nahi, koi setting nahi — Dream Valley bachhe ki umar aur mood dekhkar sahi kahani aur awaaz khud chunta hai.',
      byAge: 'Umar ke hisaab se',
      byMood: 'Mood ke hisaab se',
      moodExplainer: 'Ek energetic bachhe ko ghabraaye hue bachhe se alag kahani chahiye.',
    },
    premium: {
      title: 'Dream Valley Premium',
      line: 'Sab kuch unlock karein — voice cloning, zyada kid profiles, aur poori saved library.',
      cta: 'Plans dekhein',
    },
    download: {
      bandTitle: 'Dream Valley ko kahin bhi le jaayein',
    },
    finalCta: {
      title: 'Aaj raat ki kahani taiyaar hai.',
      sub: 'Har raat ek naya adventure — shaant awaaz, original music, aur art jo bachhe ko neend tak le jaaye.',
      cta: 'Aaj raat free mein shuru karein',
      noCard: 'Koi credit card nahi chahiye. Har raat free kahaniyaan.',
      getApp: 'App download karein',
    },
    footer: {
      tagline: 'Bachhon ke liye jaadui bedtime kahaniyaan',
      colProduct: 'Product',
      colApp: 'App Lein',
      colListen: 'Suniye',
      colLegal: 'Legal',
      lkHowItWorks: 'Kaise Kaam Karta Hai',
      lkAbout: 'Hamaare Baare Mein',
      lkBlog: 'Blog',
      lkContact: 'Sampark',
      lkIos: 'iOS App Store',
      lkPlay: 'Google Play',
      lkRadio: 'Dream Valley Radio',
      lkPrivacy: 'Privacy Policy',
      lkTerms: 'Niyam aur Shartein',
      trust: 'Dream Valley kahaniyaan, narration, music aur art banaane ke liye AI ka istemaal karta hai. Content ko age-appropriate aur safe banaane ke liye review kiya jaata hai.',
      rights: 'Saare adhikaar surakshit.',
    },
    typeBadge: { story: 'Kahani', song: 'Lori', long_story: 'Kahani' },
  },
};

export const MOODS = [
  { e: '😌', en: 'Calm', hi: 'Shaant' },
  { e: '🔍', en: 'Curious', hi: 'Utsuk' },
  { e: '⚡', en: 'Wired', hi: 'Energetic' },
  { e: '💧', en: 'Sad', hi: 'Udaas' },
  { e: '🌀', en: 'Anxious', hi: 'Ghabraaya' },
  { e: '🔥', en: 'Angry', hi: 'Gussa' },
];

export const AGES = [
  { href: '/ages/0-1', en: 'Ages 0-1', hi: 'Umra 0-1' },
  { href: '/ages/2-5', en: 'Ages 2-5', hi: 'Umra 2-5' },
  { href: '/ages/6-8', en: 'Ages 6-8', hi: 'Umra 6-8' },
  { href: '/ages/9-12', en: 'Ages 9-12', hi: 'Umra 9-12' },
];
