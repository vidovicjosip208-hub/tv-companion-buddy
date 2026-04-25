export interface ContentItem {

  id: string;

  title: string;

  thumbnail: string;

  progress?: number; // 0-100, indicates Continue Watching item

}

export interface ContentRowData {

  title: string;

  titleHighlight?: string;

  items: ContentItem[];

}

export interface ContentDetailsData {

  title: string;

  year: string;

  genre: string;

  episodes?: string;

  rating: string;

  description: string;

}

// Movies

const movies: ContentItem[] = [

  { id: "m1", title: "Glass Onion", thumbnail: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80" },

  { id: "m2", title: "Enola Holmes", thumbnail: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80" },

  { id: "m3", title: "All Quiet", thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80" },

  { id: "m4", title: "Troll", thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80" },

  { id: "m5", title: "Bardo", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80" },

];

const moviesFeatured: ContentItem[] = [

  { id: "m6", title: "Set It Up", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80" },

  { id: "m7", title: "The Batman", thumbnail: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=600&q=80" },

  { id: "m8", title: "Top Gun: Maverick", thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80" },

  { id: "m9", title: "Everything Everywhere", thumbnail: "https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=400&q=80" },

  { id: "m10", title: "Bullet Train", thumbnail: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&q=80" },

];

// TV Shows

const shows: ContentItem[] = [

  { id: "s1", title: "Breaking Bad", thumbnail: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=400&q=80" },

  { id: "s2", title: "Dark", thumbnail: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80" },

  { id: "s3", title: "Money Heist", thumbnail: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=400&q=80" },

  { id: "s4", title: "Peaky Blinders", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80" },

  { id: "s5", title: "Stranger Things", thumbnail: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80" },

];

const showsTrending: ContentItem[] = [

  { id: "s6", title: "Wednesday", thumbnail: "https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=400&q=80" },

  { id: "s7", title: "The Crown", thumbnail: "https://images.unsplash.com/photo-1460881680858-30d872d5b530?w=400&q=80" },

  { id: "s8", title: "Squid Game", thumbnail: "https://images.unsplash.com/photo-1626814026-a4e19be3a2b7?w=400&q=80" },

  { id: "s9", title: "You", thumbnail: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&q=80" },

  { id: "s10", title: "Dahmer", thumbnail: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&q=80" },

];

const myList: ContentItem[] = [

  { id: "ml1", title: "S.W.A.T.", thumbnail: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=600&q=80" },

  { id: "ml2", title: "Outer Banks", thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80" },

  { id: "ml3", title: "Ratched", thumbnail: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80" },

  { id: "ml4", title: "The Witcher", thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80" },

  { id: "ml5", title: "Set It Up", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80" },

];

// Continue Watching - items with progress

const continueWatching: ContentItem[] = [

  { id: "s1", title: "Breaking Bad", thumbnail: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=400&q=80", progress: 35 },

  { id: "s2", title: "Dark", thumbnail: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80", progress: 70 },

  { id: "m7", title: "The Batman", thumbnail: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=600&q=80", progress: 50 },

  { id: "s6", title: "Wednesday", thumbnail: "https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=400&q=80", progress: 20 },

  { id: "m8", title: "Top Gun: Maverick", thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80", progress: 85 },

];

// Page-specific row configurations

export const homeRows: ContentRowData[] = [

  { title: "Continue Watching", items: continueWatching },

  { title: "My List", items: myList },

  { title: "TV Shows & Movies", titleHighlight: "You've Liked", items: [...shows.slice(0, 3), ...movies.slice(0, 2)] },

  { title: "Trending Now", items: [...showsTrending.slice(0, 3), ...moviesFeatured.slice(0, 2)] },

  { title: "New Releases", items: movies },

];

export const showsRows: ContentRowData[] = [

  { title: "Continue Watching", items: continueWatching.filter(i => i.id.startsWith("s")) },

  { title: "Popular Shows", items: shows },

  { title: "Trending Series", items: showsTrending },

  { title: "Drama Series", items: [...shows.slice(2), ...showsTrending.slice(0, 2)] },

  { title: "Must Watch", items: [...showsTrending.slice(2), ...shows.slice(0, 2)] },

];

export const myListRows: ContentRowData[] = [

  { title: "My List", items: myList },

  { title: "Recently Added", items: [...myList.slice(2), ...shows.slice(0, 2)] },

];

export const moviesRows: ContentRowData[] = [

  { title: "Continue Watching", items: continueWatching.filter(i => i.id.startsWith("m")) },

  { title: "Popular Movies", items: movies },

  { title: "Featured Films", items: moviesFeatured },

  { title: "New Releases", items: [...movies.slice(2), ...moviesFeatured.slice(0, 2)] },

  { title: "Top Rated", items: [...moviesFeatured.slice(2), ...movies.slice(0, 2)] },

];

// Details data for all items

export const detailsData: Record<string, ContentDetailsData> = {

  ml1: { title: "S.W.A.T.", year: "2017", genre: "TV Dramas", episodes: "7 Episodes", rating: "TV-14", description: "In his hometown of Los Angeles, a sergeant is tasked with leading an elite team of officers — and defusing deadly tensions in his community." },

  ml2: { title: "Outer Banks", year: "2020", genre: "Teen Drama", episodes: "3 Seasons", rating: "TV-MA", description: "Grupa tinejdžera iz Outer Banksa kreće u potragu za blagom koje je povezano s nestankom oca jednog od njih." },

  ml3: { title: "Ratched", year: "2020", genre: "Psychological Thriller", episodes: "1 Season", rating: "TV-MA", description: "Priča o podrijetlu jedne od najpoznatijih negativki u povijesti filma — medicinske sestre Ratched." },

  ml4: { title: "The Witcher", year: "2019", genre: "Fantasy Drama", episodes: "3 Seasons", rating: "TV-MA", description: "Geralt od Rivije, usamljeni lovac na čudovišta, bori se pronaći svoje mjesto u svijetu." },

  ml5: { title: "Set It Up", year: "2018", genre: "Romantic Comedy", rating: "PG-13", description: "Dva prezaposlena asistenta pokušavaju spojiti svoje zahtjevne šefove kako bi sebi olakšali život na poslu." },

  s1: { title: "Breaking Bad", year: "2008", genre: "Crime Drama", episodes: "5 Seasons", rating: "TV-MA", description: "Profesor kemije pretvara se u proizvođača metaamfetamina kako bi osigurao financijsku budućnost svoje obitelji." },

  s2: { title: "Dark", year: "2017", genre: "Sci-Fi Thriller", episodes: "3 Seasons", rating: "TV-MA", description: "Nestanak djece otkriva tajne četiri povezane obitelji dok istražuju zavjeru koja se proteže kroz tri generacije." },

  s3: { title: "Money Heist", year: "2017", genre: "Crime Thriller", episodes: "5 Parts", rating: "TV-MA", description: "Genijalni Profesor okuplja grupu kriminalaca za najambiciozniju pljačku u povijesti Španjolske." },

  s4: { title: "Peaky Blinders", year: "2013", genre: "Crime Drama", episodes: "6 Seasons", rating: "TV-MA", description: "Obitelj Shelby vodi jednu od najžešćih bandi u Birminghamu nakon Prvog svjetskog rata." },

  s5: { title: "Stranger Things", year: "2016", genre: "Sci-Fi Horror", episodes: "4 Seasons", rating: "TV-14", description: "Grupa djece otkriva nadnaravne sile i tajne vladine eksperimente u svom malom gradu." },

  s6: { title: "Wednesday", year: "2022", genre: "Comedy Horror", episodes: "1 Season", rating: "TV-14", description: "Wednesday Addams istražuje seriju ubojstava dok pohađa akademiju Nevermore." },

  s7: { title: "The Crown", year: "2016", genre: "Historical Drama", episodes: "6 Seasons", rating: "TV-MA", description: "Politički rivaliteti i romantika vladavine kraljice Elizabete II." },

  s8: { title: "Squid Game", year: "2021", genre: "Thriller Drama", episodes: "1 Season", rating: "TV-MA", description: "Stotine igrača u dugovima prihvaćaju poziv na natjecanje u dječjim igrama za veliku nagradu." },

  s9: { title: "You", year: "2018", genre: "Psychological Thriller", episodes: "4 Seasons", rating: "TV-MA", description: "Šarmantni knjižničar koristi tehnologiju za stvaranje romantičnih veza koje prelaze u opsesiju." },

  s10: { title: "Dahmer", year: "2022", genre: "True Crime", episodes: "1 Season", rating: "TV-MA", description: "Priča o jednom od najozloglašenijih serijskih ubojica u Americi." },

  m1: { title: "Glass Onion", year: "2022", genre: "Mystery Comedy", rating: "PG-13", description: "Detektiv Benoit Blanc putuje u Grčku kako bi riješio misterij među bogatim ekscentricima." },

  m2: { title: "Enola Holmes", year: "2020", genre: "Adventure", rating: "PG-13", description: "Mlađa sestra Sherlocka Holmesa kreće u potragu za nestalom majkom." },

  m3: { title: "All Quiet", year: "2022", genre: "War Drama", rating: "R", description: "Mladi njemački vojnik suočava se s užasima Prvog svjetskog rata na zapadnom frontu." },

  m4: { title: "Troll", year: "2022", genre: "Action Fantasy", rating: "TV-14", description: "Ogromni trol probudi se u norveškim planinama i kreće prema Oslu." },

  m5: { title: "Bardo", year: "2022", genre: "Drama Comedy", rating: "R", description: "Meksički novinar i filmski redatelj suočava se s egzistencijalnom krizom." },

  m6: { title: "Set It Up", year: "2018", genre: "Romantic Comedy", rating: "PG-13", description: "Dva prezaposlena asistenta pokušavaju spojiti svoje zahtjevne šefove." },

  m7: { title: "The Batman", year: "2022", genre: "Action Thriller", rating: "PG-13", description: "Batman otkriva korupciju u Gotham Cityju dok lovi serijskog ubojicu poznatog kao Riddler." },

  m8: { title: "Top Gun: Maverick", year: "2022", genre: "Action Drama", rating: "PG-13", description: "Pete Mitchell trenira novu generaciju pilota za opasnu misiju." },

  m9: { title: "Everything Everywhere", year: "2022", genre: "Sci-Fi Comedy", rating: "R", description: "Kineska imigrantica otkriva da može pristupiti paralelnim univerzumima." },

  m10: { title: "Bullet Train", year: "2022", genre: "Action Comedy", rating: "R", description: "Pet ubojica se nađe u brzom vlaku s povezanim misijama." },

};

// All items combined for search

export const allContentItems: ContentItem[] = [

  ...movies, ...moviesFeatured, ...shows, ...showsTrending, ...myList,

];

// Episode data

export interface EpisodeData {

  id: string;

  number: number;

  title: string;

  description: string;

  duration: string;

  thumbnail: string;

  progress?: number; // 0-100

}

export interface SeasonData {

  season: number;

  episodes: EpisodeData[];

}

export const episodesData: Record<string, SeasonData[]> = {

  s1: [

    { season: 1, episodes: [

      { id: "s1e1", number: 1, title: "Pilot", description: "Walter White, profesor kemije, saznaje da ima rak pluća i odlučuje se na drastičan korak.", duration: "58m", thumbnail: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=400&q=80", progress: 40 },

      { id: "s1e2", number: 2, title: "Cat's in the Bag...", description: "Walt i Jesse pokušavaju riješiti se tijela nakon prvog kuharenja.", duration: "48m", thumbnail: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80" },

      { id: "s1e3", number: 3, title: "...And the Bag's in the River", description: "Walt se suočava s teškom moralnom dilemom dok Jesse pokušava prodati proizvod.", duration: "48m", thumbnail: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=400&q=80" },

      { id: "s1e4", number: 4, title: "Cancer Man", description: "Walt otkriva obitelji svoju dijagnozu dok Jesse pokušava obnoviti odnos s roditeljima.", duration: "48m", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80" },

    ]},

    { season: 2, episodes: [

      { id: "s1s2e1", number: 1, title: "Seven Thirty-Seven", description: "Walt i Jesse suočavaju se s opasnim Tucom.", duration: "47m", thumbnail: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80" },

      { id: "s1s2e2", number: 2, title: "Grilled", description: "Tuco odvodi Walta i Jesseja u pustinju.", duration: "48m", thumbnail: "https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=400&q=80" },

      { id: "s1s2e3", number: 3, title: "Bit by a Dead Bee", description: "Walt smišlja priču za svoje nestajanje.", duration: "47m", thumbnail: "https://images.unsplash.com/photo-1460881680858-30d872d5b530?w=400&q=80" },

    ]},

    { season: 3, episodes: [

      { id: "s1s3e1", number: 1, title: "No Más", description: "Walt se suočava s posljedicama pada aviona.", duration: "47m", thumbnail: "https://images.unsplash.com/photo-1626814026-a4e19be3a2b7?w=400&q=80" },

      { id: "s1s3e2", number: 2, title: "Caballo Sin Nombre", description: "Dva opasna meksička ubojica dolaze u Albuquerque.", duration: "47m", thumbnail: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&q=80" },

    ]},

  ],

  s2: [

    { season: 1, episodes: [

      { id: "s2e1", number: 1, title: "Secrets", description: "Djeca nestaju u malom njemačkom gradiću, otkrivajući tamne tajne.", duration: "52m", thumbnail: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80", progress: 100 },

      { id: "s2e2", number: 2, title: "Lies", description: "Istraga otkriva neočekivane veze između obitelji.", duration: "44m", thumbnail: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=400&q=80" },

      { id: "s2e3", number: 3, title: "Past and Present", description: "Putovanje kroz vrijeme komplicira sve.", duration: "50m", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80" },

    ]},

    { season: 2, episodes: [

      { id: "s2s2e1", number: 1, title: "Beginnings and Endings", description: "Nova poglavlja otvaraju se u prošlosti i budućnosti.", duration: "53m", thumbnail: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80" },

      { id: "s2s2e2", number: 2, title: "Dark Matter", description: "Jonas otkriva pravu prirodu putovanja kroz vrijeme.", duration: "46m", thumbnail: "https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=400&q=80" },

    ]},

  ],

};

// Default episodes for items without specific data

const defaultEpisodes: SeasonData[] = [

  { season: 1, episodes: [

    { id: "de1", number: 1, title: "Episode 1", description: "Prva epizoda serije koja postavlja temelje priče.", duration: "45m", thumbnail: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=400&q=80", progress: 40 },

    { id: "de2", number: 2, title: "Episode 2", description: "Radnja se nastavlja razvijati u neočekivanom smjeru.", duration: "42m", thumbnail: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80" },

    { id: "de3", number: 3, title: "Episode 3", description: "Likovi se suočavaju s novim izazovima.", duration: "48m", thumbnail: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=400&q=80" },

  ]},

  { season: 2, episodes: [

    { id: "de4", number: 1, title: "New Beginnings", description: "Druga sezona donosi nove početke i preokrete.", duration: "50m", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80" },

    { id: "de5", number: 2, title: "Rising Tensions", description: "Napetost raste dok se tajne otkrivaju.", duration: "44m", thumbnail: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80" },

  ]},

];

export const getEpisodesForItem = (itemId: string): SeasonData[] => {

  return episodesData[itemId] || defaultEpisodes;

};

// Fallback details

export const defaultDetails: ContentDetailsData = {

  title: "Unknown",

  year: "2022",

  genre: "Drama",

  rating: "TV-MA",

  description: "No description available.",

};
