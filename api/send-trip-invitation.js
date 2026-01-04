import nodemailer from 'nodemailer';

// Simple in-memory rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_INVITATIONS_PER_WINDOW = 20;

function checkRateLimit(senderEmail) {
  const now = Date.now();
  const key = senderEmail.toLowerCase();
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  
  const record = rateLimitMap.get(key);
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (record.count >= MAX_INVITATIONS_PER_WINDOW) {
    return false;
  }
  record.count++;
  return true;
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// Get destination image from Unsplash
function getDestinationImage(destination) {
  const query = encodeURIComponent(destination + ' travel landscape');
  return `https://source.unsplash.com/800x400/?${query}`;
}

// Generate travel tips based on destination
function getTravelTips(destination) {
  const tips = {
    // India - Popular Destinations
    'goa': [
      '🏖️ Best beaches: Palolem, Anjuna, Baga',
      '🍽️ Try local Goan fish curry and bebinca',
      '🛵 Rent a scooter for easy exploration',
      '🌅 Don\'t miss sunset at Chapora Fort'
    ],
    'manali': [
      '🏔️ Visit Solang Valley for adventure sports',
      '🛕 Explore Hadimba Temple',
      '🧥 Pack warm clothes even in summer',
      '🚗 Take a trip to Rohtang Pass'
    ],
    'kerala': [
      '🛶 Houseboat stay in Alleppey backwaters',
      '🌿 Visit tea plantations in Munnar',
      '🐘 Periyar Wildlife Sanctuary',
      '💆 Try authentic Ayurvedic massage'
    ],
    'rajasthan': [
      '🏰 Explore forts of Jaipur, Jodhpur, Udaipur',
      '🐪 Desert safari in Jaisalmer',
      '🍛 Savor Dal Baati Churma',
      '🛍️ Shop for handicrafts and textiles'
    ],
    'jaipur': [
      '🏰 Visit Amber Fort and Hawa Mahal',
      '📸 Pink City is best explored on foot',
      '🛍️ Shop at Johari Bazaar for jewelry',
      '🍛 Try authentic Rajasthani thali'
    ],
    'udaipur': [
      '🏰 Lake Palace and City Palace are must-visits',
      '🚤 Take a boat ride on Lake Pichola',
      '🌅 Watch sunset from Sajjangarh Palace',
      '🎨 Explore local miniature paintings'
    ],
    'shimla': [
      '🚂 Toy train ride is a must experience',
      '🏔️ Visit Kufri for snow activities',
      '🛍️ Mall Road for shopping and food',
      '⛪ Christ Church is iconic'
    ],
    'ladakh': [
      '🏔️ Acclimatize for 1-2 days before activities',
      '🛵 Bike trip to Khardung La pass',
      '🏞️ Pangong Lake is breathtaking',
      '🙏 Visit ancient monasteries'
    ],
    'leh': [
      '🏔️ Take it slow - altitude is high',
      '🏍️ Rent a Royal Enfield for road trips',
      '🏞️ Nubra Valley sand dunes are unique',
      '☕ Try butter tea with locals'
    ],
    'rishikesh': [
      '🧘 Join a yoga or meditation session',
      '🚣 River rafting in the Ganges',
      '🌉 Walk across Laxman Jhula',
      '🍃 It\'s a vegetarian and alcohol-free zone'
    ],
    'varanasi': [
      '🛕 Witness Ganga Aarti at Dashashwamedh Ghat',
      '🚣 Sunrise boat ride on the Ganges',
      '🍛 Try local street food at Kachori Gali',
      '🎭 Explore the narrow ancient lanes'
    ],
    'agra': [
      '🕌 Visit Taj Mahal at sunrise',
      '🏰 Agra Fort is equally impressive',
      '🍽️ Try Mughlai cuisine and petha sweets',
      '📸 Mehtab Bagh for sunset Taj views'
    ],
    'mumbai': [
      '🌊 Marine Drive evening walk is iconic',
      '🍽️ Street food at Chowpatty Beach',
      '🎬 Bollywood studio tour',
      '🚂 Experience local train during off-peak'
    ],
    'delhi': [
      '🏛️ Red Fort and Qutub Minar are must-visits',
      '🍛 Chandni Chowk for street food paradise',
      '🛍️ Dilli Haat for handicrafts',
      '🚇 Metro is the best way to get around'
    ],
    'bangalore': [
      '🌳 Cubbon Park for morning walks',
      '🍺 Craft beer scene is amazing',
      '🛍️ MG Road and Brigade Road for shopping',
      '🍛 Try Bisi Bele Bath and filter coffee'
    ],
    'hyderabad': [
      '🍗 Biryani is a must - try Paradise or Bawarchi',
      '🏰 Charminar and Golconda Fort',
      '🛍️ Laad Bazaar for bangles',
      '🎢 Ramoji Film City for a day out'
    ],
    'chennai': [
      '🏖️ Marina Beach evening stroll',
      '🛕 Kapaleeshwarar Temple visit',
      '🍛 Filter coffee and dosa breakfast',
      '🎭 Catch a Bharatanatyam performance'
    ],
    'kolkata': [
      '🏛️ Victoria Memorial is stunning',
      '🍛 Try Kathi rolls and mishti doi',
      '🚃 Ride the iconic yellow trams',
      '📚 College Street for book lovers'
    ],
    'darjeeling': [
      '🚂 Toy train ride through tea gardens',
      '🌄 Tiger Hill sunrise view of Kanchenjunga',
      '☕ Visit tea estates and taste fresh brew',
      '🏔️ Pleasant weather year-round'
    ],
    'sikkim': [
      '🏔️ Gangtok has stunning Himalayan views',
      '🙏 Visit Rumtek Monastery',
      '🌸 Best visited during spring flowers',
      '📜 Permits needed for some areas'
    ],
    'andaman': [
      '🏝️ Radhanagar Beach is Asia\'s best',
      '🤿 Scuba diving at Havelock Island',
      '🏛️ Cellular Jail light and sound show',
      '🚤 Island hopping is a must'
    ],
    'ooty': [
      '🚂 Nilgiri Mountain Railway experience',
      '🌹 Botanical Gardens are beautiful',
      '☕ Fresh tea from local estates',
      '🏞️ Boat ride at Ooty Lake'
    ],
    'coorg': [
      '☕ Coffee plantation tours',
      '🌊 Abbey Falls is picturesque',
      '🍛 Try Kodava cuisine - pandi curry',
      '🌿 Perfect for nature walks'
    ],
    'pondicherry': [
      '🏛️ French Quarter has colonial charm',
      '🏖️ Paradise and Serenity beaches',
      '🧘 Auroville for spiritual experience',
      '🍷 Try French cafes and bakeries'
    ],
    'hampi': [
      '🏛️ UNESCO World Heritage ruins',
      '🚲 Rent a bicycle to explore',
      '🌅 Sunset from Hemakuta Hill',
      '🛕 Virupaksha Temple is still active'
    ],
    'mysore': [
      '🏰 Mysore Palace lit up at night',
      '🛍️ Silk sarees and sandalwood',
      '🍛 Mysore Pak and Masala Dosa',
      '🏔️ Day trip to Chamundi Hills'
    ],
    'amritsar': [
      '🛕 Golden Temple is breathtaking',
      '🍛 Langar (free community meal) experience',
      '🏛️ Jallianwala Bagh memorial',
      '🍽️ Eat at Kesar Da Dhaba'
    ],
    'mcleodganj': [
      '🙏 Visit the Dalai Lama Temple',
      '🏔️ Trek to Triund for views',
      '🍜 Tibetan food - momos and thukpa',
      '🧘 Meditation and yoga retreats'
    ],
    'kasol': [
      '🏔️ Backpacker paradise in Parvati Valley',
      '🥾 Trek to Kheerganga hot springs',
      '🍕 Israeli cafes with great food',
      '🌿 Peaceful riverside camping'
    ],
    'spiti': [
      '🏔️ High altitude desert valley',
      '🙏 Key Monastery is iconic',
      '🚗 Road trip from Manali is epic',
      '⭐ Best stargazing in India'
    ],
    'rann of kutch': [
      '🌕 White desert during full moon',
      '🎪 Rann Utsav festival (Nov-Feb)',
      '🐪 Camel safari experience',
      '🎨 Local handicrafts and embroidery'
    ],
    'meghalaya': [
      '🌉 Living root bridges trek',
      '🌧️ Cherrapunji - wettest place on earth',
      '🏞️ Dawki river crystal clear waters',
      '🍖 Try Jadoh and smoked meats'
    ],
    'arunachal': [
      '🏔️ Tawang Monastery is stunning',
      '📜 Inner Line Permit required',
      '🌸 Best during spring and autumn',
      '🎭 Rich tribal culture'
    ],
    
    // International - Asia
    'thailand': [
      '🛕 Visit Grand Palace in Bangkok',
      '🏝️ Island hop in Phi Phi or Krabi',
      '🍜 Street food is a must-try',
      '🐘 Ethical elephant sanctuaries in Chiang Mai'
    ],
    'bali': [
      '🛕 Visit Tanah Lot and Uluwatu temples',
      '🌾 Walk through Tegallalang rice terraces',
      '🏄 Try surfing at Kuta Beach',
      '🍜 Enjoy local Nasi Goreng'
    ],
    'singapore': [
      '🌳 Gardens by the Bay light show',
      '🍜 Hawker centers for cheap eats',
      '🎰 Marina Bay Sands views',
      '🚇 MRT is efficient and cheap'
    ],
    'malaysia': [
      '🏙️ Petronas Towers in KL',
      '🍜 Penang street food is legendary',
      '🏝️ Langkawi for beaches',
      '🌿 Cameron Highlands for tea'
    ],
    'vietnam': [
      '🏍️ Motorbike is the way to travel',
      '🍜 Pho and Banh Mi everywhere',
      '🏞️ Ha Long Bay cruise',
      '🏮 Hoi An ancient town charm'
    ],
    'cambodia': [
      '🛕 Angkor Wat sunrise is magical',
      '🎫 Get a 3-day temple pass',
      '🍜 Try Fish Amok and Lok Lak',
      '🏛️ Learn about Khmer history'
    ],
    'japan': [
      '🚄 JR Pass for bullet trains',
      '🌸 Cherry blossoms in spring',
      '🍣 Sushi and ramen paradise',
      '🏯 Kyoto temples are serene'
    ],
    'tokyo': [
      '🗼 Shibuya crossing is iconic',
      '🍣 Tsukiji outer market for sushi',
      '🎮 Akihabara for anime and gaming',
      '🚇 Get a Suica card for transport'
    ],
    'korea': [
      '🍖 Korean BBQ is a must',
      '🏛️ Gyeongbokgung Palace in Seoul',
      '💄 Myeongdong for K-beauty shopping',
      '🎤 Try a noraebang (karaoke)'
    ],
    'seoul': [
      '🏛️ Bukchon Hanok Village charm',
      '🍜 Street food at Gwangjang Market',
      '🛍️ Hongdae for nightlife',
      '🚇 T-money card for transport'
    ],
    'china': [
      '🏯 Great Wall is a must-visit',
      '🍜 Regional cuisines vary greatly',
      '📱 Download offline maps (no Google)',
      '💳 WeChat Pay is everywhere'
    ],
    'hong kong': [
      '🌃 Victoria Peak night views',
      '🍜 Dim sum breakfast tradition',
      '⛴️ Star Ferry across the harbor',
      '🛍️ Temple Street night market'
    ],
    'maldives': [
      '🏝️ Overwater villas are dreamy',
      '🤿 Snorkeling with manta rays',
      '🌅 Sunset dolphin cruises',
      '💰 Budget tip: stay on local islands'
    ],
    'sri lanka': [
      '🚂 Scenic train to Ella',
      '🐘 Elephant safari at Minneriya',
      '🏖️ Beaches in the south',
      '☕ Ceylon tea country is beautiful'
    ],
    'nepal': [
      '🏔️ Everest Base Camp trek',
      '🛕 Pashupatinath Temple in Kathmandu',
      '🙏 Boudhanath Stupa peace',
      '🍛 Try Dal Bhat - unlimited refills!'
    ],
    'bhutan': [
      '🏔️ Tiger\'s Nest Monastery trek',
      '🎫 Daily tourist fee applies',
      '🙏 Gross National Happiness country',
      '🏛️ Dzongs are architectural marvels'
    ],
    'dubai': [
      '🏙️ Burj Khalifa views',
      '🛍️ Dubai Mall is massive',
      '🏜️ Desert safari with BBQ dinner',
      '🌴 Palm Jumeirah beach clubs'
    ],
    'abu dhabi': [
      '🕌 Sheikh Zayed Mosque is stunning',
      '🏎️ Ferrari World for thrill seekers',
      '🏝️ Yas Island beaches',
      '🎨 Louvre Abu Dhabi museum'
    ],
    
    // International - Europe
    'paris': [
      '🗼 Book Eiffel Tower tickets in advance',
      '🥐 Start mornings with fresh croissants',
      '🎨 Spend a day at the Louvre',
      '🚶 Walk along the Seine at sunset'
    ],
    'london': [
      '🎡 London Eye for city views',
      '🏛️ British Museum is free',
      '🚇 Get an Oyster card',
      '☕ Afternoon tea experience'
    ],
    'rome': [
      '🏛️ Colosseum and Vatican are must-sees',
      '🍝 Pasta in Trastevere neighborhood',
      '⛲ Throw a coin in Trevi Fountain',
      '🚶 Best explored on foot'
    ],
    'italy': [
      '🍕 Pizza in Naples is the original',
      '🚂 Trains connect major cities well',
      '🍷 Wine tasting in Tuscany',
      '🛥️ Venice gondola ride'
    ],
    'spain': [
      '🏛️ Sagrada Familia in Barcelona',
      '💃 Flamenco show in Seville',
      '🍷 Tapas hopping is a must',
      '🌅 Late dinners are normal'
    ],
    'barcelona': [
      '🏛️ Gaudí architecture everywhere',
      '🏖️ Barceloneta Beach',
      '🍷 La Boqueria market',
      '⚽ Camp Nou stadium tour'
    ],
    'amsterdam': [
      '🚲 Rent a bike like locals',
      '🎨 Van Gogh Museum',
      '🏠 Canal house architecture',
      '🌷 Tulips in spring'
    ],
    'switzerland': [
      '🏔️ Swiss Alps are breathtaking',
      '🚂 Scenic train journeys',
      '🧀 Fondue and chocolate',
      '💰 It\'s expensive - budget well'
    ],
    'greece': [
      '🏛️ Acropolis in Athens',
      '🏝️ Island hop in the Cyclades',
      '🍽️ Greek salad and souvlaki',
      '🌅 Santorini sunsets'
    ],
    'santorini': [
      '🌅 Oia sunset is world-famous',
      '🏊 Red and black sand beaches',
      '🍷 Local wine tasting',
      '🚤 Boat trip to volcano'
    ],
    'germany': [
      '🍺 Beer gardens in Munich',
      '🏰 Neuschwanstein Castle',
      '🚂 Efficient train network',
      '🎄 Christmas markets in winter'
    ],
    'prague': [
      '🏰 Prague Castle views',
      '🍺 Cheapest beer in Europe',
      '🌉 Charles Bridge at sunrise',
      '⏰ Astronomical Clock show'
    ],
    'vienna': [
      '🎵 Classical music concerts',
      '🏛️ Schönbrunn Palace',
      '☕ Coffee house culture',
      '🍰 Sachertorte chocolate cake'
    ],
    'portugal': [
      '🏖️ Algarve beaches',
      '🚃 Lisbon tram rides',
      '🍷 Port wine in Porto',
      '🥧 Pastéis de nata everywhere'
    ],
    'iceland': [
      '🌌 Northern Lights (winter)',
      '♨️ Blue Lagoon geothermal spa',
      '🚗 Ring Road road trip',
      '🌋 Volcanic landscapes'
    ],
    'norway': [
      '🏔️ Fjord cruises are stunning',
      '🌌 Northern Lights in Tromsø',
      '💰 Very expensive - budget well',
      '🚂 Flåm Railway scenic route'
    ],
    'scotland': [
      '🏰 Edinburgh Castle',
      '🥃 Whisky distillery tours',
      '🏔️ Highlands road trip',
      '🎒 Isle of Skye is magical'
    ],
    'ireland': [
      '🍀 Dublin pubs and live music',
      '🏰 Cliffs of Moher',
      '🥃 Whiskey vs Whisky tour',
      '🚗 Wild Atlantic Way drive'
    ],
    'croatia': [
      '🏰 Dubrovnik old town (Game of Thrones)',
      '🏝️ Plitvice Lakes National Park',
      '🏖️ Island hopping along coast',
      '🍷 Local wines are great'
    ],
    'turkey': [
      '🎈 Hot air balloon in Cappadocia',
      '🕌 Hagia Sophia in Istanbul',
      '🛁 Turkish bath experience',
      '🍢 Kebabs and baklava'
    ],
    'istanbul': [
      '🕌 Blue Mosque and Hagia Sophia',
      '🛍️ Grand Bazaar shopping',
      '🚢 Bosphorus cruise',
      '☕ Turkish coffee and tea'
    ],
    
    // International - Americas
    'usa': [
      '🗽 NYC, LA, and national parks',
      '🚗 Road trips are the best way',
      '💳 Tip 15-20% at restaurants',
      '📱 Get a local SIM card'
    ],
    'new york': [
      '🗽 Statue of Liberty ferry',
      '🌳 Central Park walks',
      '🎭 Broadway show',
      '🍕 Dollar pizza slices'
    ],
    'las vegas': [
      '🎰 Casinos on the Strip',
      '🏜️ Grand Canyon day trip',
      '🎪 Free shows on Fremont Street',
      '🍽️ Buffets are legendary'
    ],
    'california': [
      '🌉 Golden Gate Bridge in SF',
      '🎬 Hollywood in LA',
      '🏖️ San Diego beaches',
      '🍷 Napa Valley wine country'
    ],
    'hawaii': [
      '🏖️ Waikiki Beach in Oahu',
      '🌋 Volcanoes National Park',
      '🤙 Learn to surf',
      '🌺 Luau dinner show'
    ],
    'canada': [
      '🍁 Niagara Falls',
      '🏔️ Banff National Park',
      '🏙️ Toronto and Vancouver',
      '🦫 Wildlife spotting'
    ],
    'mexico': [
      '🏖️ Cancun and Riviera Maya',
      '🏛️ Mayan ruins at Chichen Itza',
      '🌮 Tacos and tequila',
      '🎨 Mexico City culture'
    ],
    'brazil': [
      '🗿 Christ the Redeemer in Rio',
      '🏖️ Copacabana Beach',
      '🌴 Amazon rainforest',
      '💃 Samba and Carnival'
    ],
    'peru': [
      '🏔️ Machu Picchu trek',
      '🍽️ Ceviche in Lima',
      '🦙 Llamas everywhere',
      '🏞️ Sacred Valley'
    ],
    'argentina': [
      '💃 Tango in Buenos Aires',
      '🥩 Best steaks in the world',
      '🏔️ Patagonia glaciers',
      '🍷 Mendoza wine region'
    ],
    
    // International - Africa & Oceania
    'australia': [
      '🏖️ Bondi Beach in Sydney',
      '🐨 Wildlife is unique',
      '🏜️ Uluru in the outback',
      '🤿 Great Barrier Reef snorkeling'
    ],
    'sydney': [
      '🏛️ Opera House and Harbour Bridge',
      '🏖️ Bondi to Coogee walk',
      '🐨 Taronga Zoo',
      '🚢 Ferry rides are scenic'
    ],
    'new zealand': [
      '🏔️ Lord of the Rings landscapes',
      '🚗 Road trip both islands',
      '🪂 Adventure sports capital',
      '🥝 Kiwi bird spotting'
    ],
    'south africa': [
      '🦁 Safari in Kruger National Park',
      '🏔️ Table Mountain in Cape Town',
      '🍷 Stellenbosch wine region',
      '🐧 Penguins at Boulders Beach'
    ],
    'egypt': [
      '🏛️ Pyramids of Giza',
      '🚢 Nile River cruise',
      '🏛️ Luxor temples',
      '🐪 Camel ride in the desert'
    ],
    'morocco': [
      '🏜️ Sahara desert camping',
      '🛍️ Marrakech souks',
      '🍵 Mint tea everywhere',
      '🏛️ Blue city of Chefchaouen'
    ],
    'kenya': [
      '🦁 Masai Mara safari',
      '🐘 Big Five wildlife',
      '🏖️ Mombasa beaches',
      '👥 Maasai village visit'
    ],
    'tanzania': [
      '🏔️ Mount Kilimanjaro',
      '🦁 Serengeti migration',
      '🏝️ Zanzibar beaches',
      '🐘 Ngorongoro Crater'
    ],
    'mauritius': [
      '🏖️ Beautiful beaches everywhere',
      '🌊 Water sports paradise',
      '🌈 Seven Colored Earths',
      '🍛 Creole cuisine'
    ],
    'seychelles': [
      '🏝️ Pristine beaches',
      '🐢 Giant tortoises',
      '🤿 Snorkeling paradise',
      '💰 Luxury but worth it'
    ],
    
    // Generic categories
    'beach': [
      '🏖️ Pack reef-safe sunscreen',
      '🤿 Snorkeling gear often rentable',
      '🌅 Sunrise and sunset are magical',
      '💧 Stay hydrated in the sun'
    ],
    'mountain': [
      '🏔️ Acclimatize before high altitude',
      '🧥 Layer your clothing',
      '🥾 Good hiking boots essential',
      '📸 Golden hour photos are best'
    ],
    'city': [
      '🚇 Public transport saves money',
      '🚶 Walking tours are great intros',
      '🍽️ Eat where locals eat',
      '📱 Download offline maps'
    ],
    'default': [
      '📱 Download offline maps before you go',
      '💳 Inform your bank about travel dates',
      '📷 Capture memories but stay present',
      '🎒 Pack light and leave room for souvenirs'
    ]
  };

  const dest = destination.toLowerCase();
  for (const [key, value] of Object.entries(tips)) {
    if (dest.includes(key)) return value;
  }
  return tips.default;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      members, 
      tripName, 
      destination,
      description,
      startDate, 
      endDate, 
      creatorName, 
      creatorEmail,
      groupId 
    } = req.body;

    // Validate required fields
    if (!members || !Array.isArray(members) || !tripName || !creatorName || !groupId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Filter members with valid emails
    const membersWithEmail = members.filter(m => m.email && isValidEmail(m.email));
    
    if (membersWithEmail.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: 'No valid emails to send' });
    }

    // Rate limit check
    if (!checkRateLimit(creatorEmail || creatorName)) {
      return res.status(429).json({ error: 'Too many invitations sent. Please try again later.' });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailAppPassword }
    });

    const baseUrl = process.env.APP_URL || 'https://www.rupiya.online';
    const tripLink = `${baseUrl}/trip-group-detail.html?id=${encodeURIComponent(groupId)}`;
    
    // Escape user data
    const safeTripName = escapeHtml(tripName);
    const safeDestination = escapeHtml(destination || 'your destination');
    const safeDescription = escapeHtml(description || '');
    const safeCreatorName = escapeHtml(creatorName);
    
    // Get travel tips and image
    const travelTips = getTravelTips(destination || '');
    const destinationImage = getDestinationImage(destination || 'travel adventure');
    
    // Format dates
    const dateRange = startDate && endDate 
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : startDate 
        ? `Starting ${formatDate(startDate)}`
        : 'Dates to be confirmed';

    // Build member list HTML
    const allMembers = [{ name: creatorName, isCreator: true }, ...members];
    const memberListHtml = allMembers.map(m => `
      <div style="display: inline-block; margin: 4px; padding: 8px 12px; background: ${m.isCreator ? '#667eea' : '#f0f0f0'}; color: ${m.isCreator ? '#fff' : '#333'}; border-radius: 20px; font-size: 13px;">
        ${escapeHtml(m.name)}${m.isCreator ? ' 👑' : ''}
      </div>
    `).join('');

    // Build tips HTML
    const tipsHtml = travelTips.map(tip => `
      <li style="margin-bottom: 8px; color: #4a4a4a; font-size: 14px;">${escapeHtml(tip)}</li>
    `).join('');

    let sentCount = 0;
    const errors = [];

    for (const member of membersWithEmail) {
      const safeMemberName = escapeHtml(member.name);
      
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="${destinationImage}" alt="${safeDestination}" style="width: 100%; height: 200px; object-fit: cover; display: block;">
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 26px; font-weight: 700;">✈️ You're Invited!</h1>
              <p style="margin: 10px 0 0; color: #667eea; font-size: 18px; font-weight: 600;">${safeTripName}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hey <strong>${safeMemberName}</strong>! 👋
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <strong>${safeCreatorName}</strong> has added you to an exciting trip to <strong>${safeDestination}</strong>! Get ready for an amazing adventure.
              </p>
              
              ${safeDescription ? `<p style="margin: 0 0 20px; color: #6b6b6b; font-size: 15px; line-height: 1.6; font-style: italic;">"${safeDescription}"</p>` : ''}
              
              <!-- Trip Details Card -->
              <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #667eea30;">
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #6b6b6b; font-size: 13px;">📅 DATES</span><br>
                      <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">${dateRange}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #6b6b6b; font-size: 13px;">📍 DESTINATION</span><br>
                      <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">${safeDestination}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Fellow Travelers -->
              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 14px; font-weight: 600;">👥 Fellow Travelers</p>
                <div style="line-height: 2.2;">
                  ${memberListHtml}
                </div>
              </div>
              
              <!-- Travel Tips -->
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 14px; font-weight: 600;">💡 Travel Tips for ${safeDestination}</p>
                <ul style="margin: 0; padding-left: 20px; list-style: none;">
                  ${tipsHtml}
                </ul>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 10px 0 20px;">
                    <a href="${tripLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                      View Trip Details
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #9b9b9b; font-size: 13px; text-align: center;">
                Track expenses, split bills, and manage your trip budget together on Rupiya
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <table style="width: 100%;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #667eea; font-size: 18px; font-weight: 700;">Rupiya</p>
                    <p style="margin: 4px 0 0; color: #9b9b9b; font-size: 12px;">Smart Trip Expense Tracking</p>
                  </td>
                  <td style="text-align: right;">
                    <p style="margin: 0; color: #9b9b9b; font-size: 12px;">© ${new Date().getFullYear()} Rupiya</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const textContent = `
You're Invited to ${tripName}!

Hey ${member.name}!

${creatorName} has added you to an exciting trip to ${destination || 'an amazing destination'}!

Trip Details:
- Dates: ${dateRange}
- Destination: ${destination || 'TBD'}
${description ? `- About: ${description}` : ''}

Fellow Travelers: ${allMembers.map(m => m.name).join(', ')}

Travel Tips:
${travelTips.join('\n')}

View trip details and track expenses: ${tripLink}

---
Rupiya - Smart Trip Expense Tracking
`;

      try {
        await transporter.sendMail({
          from: `"Rupiya Trips" <${gmailUser}>`,
          to: member.email,
          subject: `✈️ You're invited to ${safeTripName}!`,
          text: textContent,
          html: htmlContent
        });
        sentCount++;
      } catch (err) {
        errors.push({ email: member.email, error: err.message });
      }
    }

    return res.status(200).json({ 
      success: true, 
      sent: sentCount,
      total: membersWithEmail.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error sending trip invitations:', error);
    return res.status(500).json({ error: 'Failed to send invitations', details: error.message });
  }
}
