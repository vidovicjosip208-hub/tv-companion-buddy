import type { EPGChannel } from "@/components/EPGGrid";

const DEMO_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

const today = new Date().toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit" });

const baseChannels: Omit<EPGChannel, "programs">[] = [
  { id: "rts1", number: 1, name: "RTS 1", abbreviation: "RTS1", category: "vesti", streamUrl: DEMO_HLS },
  { id: "rts2", number: 2, name: "RTS 2", abbreviation: "RTS2", category: "vesti", streamUrl: DEMO_HLS },
  { id: "pink", number: 3, name: "Pink", abbreviation: "PNK", category: "zabava", streamUrl: DEMO_HLS },
  { id: "b92", number: 4, name: "B92", abbreviation: "B92", category: "vesti", streamUrl: DEMO_HLS },
  { id: "n1", number: 5, name: "N1", abbreviation: "N1", category: "vesti", streamUrl: DEMO_HLS },
  { id: "novas", number: 6, name: "Nova S", abbreviation: "NOVA", category: "zabava", streamUrl: DEMO_HLS },
  { id: "sk1", number: 7, name: "Sport Klub 1", abbreviation: "SK1", category: "sport", streamUrl: DEMO_HLS },
  { id: "sk2", number: 8, name: "Sport Klub 2", abbreviation: "SK2", category: "sport", streamUrl: DEMO_HLS },
  { id: "sk3", number: 9, name: "Sport Klub 3", abbreviation: "SK3", category: "sport", streamUrl: DEMO_HLS },
  { id: "cinemania", number: 10, name: "Cinemania", abbreviation: "CIN", category: "film", streamUrl: DEMO_HLS },
  { id: "hbo", number: 11, name: "HBO", abbreviation: "HBO", category: "film", streamUrl: DEMO_HLS },
  { id: "pikaboo", number: 12, name: "Pikaboo", abbreviation: "PIK", category: "deciji", streamUrl: DEMO_HLS },
];

const programTemplates: Record<string, { title: string; description: string }[]> = {
  vesti: [
    { title: "Jutarnji dnevnik", description: "Najnovije vesti iz zemlje i sveta." },
    { title: "Dnevnik 2", description: "Centralna informativna emisija." },
    { title: "Oko magazin", description: "Istraživačka emisija o aktuelnim temama." },
    { title: "Kasni dnevnik", description: "Pregled dana i najave za sutra." },
  ],
  sport: [
    { title: "Premier League: Live", description: "Direktan prenos utakmice." },
    { title: "NBA Highlights", description: "Najbolji trenuci iz noćašnjih utakmica." },
    { title: "Champions League", description: "Direktan prenos." },
    { title: "Sportski žurnal", description: "Pregled svih sportskih dešavanja dana." },
  ],
  film: [
    { title: "Inception", description: "SF triler Christophera Nolana." },
    { title: "The Dark Knight", description: "Batman protiv Jokera." },
    { title: "Interstellar", description: "Putovanje kroz crvotočinu." },
    { title: "Dune", description: "Epska SF saga." },
  ],
  zabava: [
    { title: "Veče sa Ivanom Ivanovićem", description: "Talk show." },
    { title: "Zadruga", description: "Rijaliti emisija." },
    { title: "Pevačica", description: "Muzički šou." },
    { title: "Farma", description: "Rijaliti." },
  ],
  deciji: [
    { title: "Peppa Prase", description: "Animirana serija za decu." },
    { title: "Paw Patrol", description: "Avanture spasilačkih pasa." },
    { title: "Masha i Medved", description: "Animirana serija." },
    { title: "Bluey", description: "Australijska animirana serija." },
  ],
};

const slots = [
  { startTime: "08:00", endTime: "10:00" },
  { startTime: "10:00", endTime: "12:30" },
  { startTime: "12:30", endTime: "14:00" },
  { startTime: "14:00", endTime: "16:30" },
  { startTime: "16:30", endTime: "18:00" },
  { startTime: "18:00", endTime: "20:00" },
  { startTime: "20:00", endTime: "22:30" },
  { startTime: "22:30", endTime: "00:30" },
];

function buildPrograms(category: string) {
  const tpl = programTemplates[category] ?? programTemplates.zabava;
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  return slots.map((slot, i) => {
    const t = tpl[i % tpl.length];
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em + (eh < sh ? 24 * 60 : 0);
    const isLive = currentMin >= startMin && currentMin < endMin;
    return {
      title: t.title,
      description: t.description,
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: today,
      isLive,
    };
  });
}

const channels: EPGChannel[] = baseChannels.map((c) => ({
  ...c,
  programs: buildPrograms(c.category ?? "zabava"),
}));

export function useChannels() {
  return { channels, isLoading: false };
}
