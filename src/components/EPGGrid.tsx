import { memo, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface EPGProgram {
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  isLive?: boolean;
  description?: string;
  season?: string;
  episode?: string;
}

export interface EPGChannel {
  id: string;
  number: number;
  name: string;
  abbreviation: string;
  logoUrl?: string | null;
  streamUrl?: string;
  category?: string;
  programs: EPGProgram[];
}

interface EPGGridProps {
  channels: EPGChannel[];
  focusedIndex: number;
  isFocusActive: boolean;
  focusedProgramIndex?: number;
  isProgramFocused?: boolean;
  onChannelClick?: (index: number) => void;
  hideSchedule?: boolean;
  isRadio?: boolean;
  showNumbers?: boolean;
  /**
   * Rasterećenje (Android TV, slabiji CPU): dok se video emitira u pozadini,
   * sve NEfokusirane stavke se renderiraju kao statični, "mrtvi" elementi —
   * bez Framer Motion animacija, bez tranzicija i bez per-item listenera.
   * Dinamičan ostaje samo video sloj i trenutno fokusirani element.
   */
  lightweight?: boolean;
}

// Ručno klampani scroll umjesto scrollIntoView({behavior:"smooth"}) — smooth scroll
// pokreće browserovu animaciju koja traje ~300ms, a strelice na daljinskom se mogu
// ponavljati svakih ~90ms (throttle u focusZone.ts). Svaki novi pritisak prekida
// animaciju u tijeku i tjera browser da naglo promijeni smjer/cilj usred nje — to se
// vizualno vidi kao trzaj. Ova funkcija umjesto toga postavlja scrollTop izravno (bez
// animacije), i to samo ako stavka nije već potpuno vidljiva — isti "nearest" efekt
// kao prije, samo bez tranzicije koja se ima s čime sudariti.
function scrollIntoViewNearest(container: HTMLElement, el: HTMLElement) {
  // Mjerimo relativno na stvarni scroll kontejner (offsetTop se odnosi na
  // offsetParent, koji ovdje NIJE lista, pa bi vrijednosti bile pomaknute).
  const elRect = el.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  const elTop = elRect.top - cRect.top + container.scrollTop;
  const elBottom = elTop + elRect.height;
  const viewTop = container.scrollTop;
  const viewBottom = viewTop + container.clientHeight;

  if (elTop < viewTop) {
    container.scrollTop = elTop;
  } else if (elBottom > viewBottom) {
    container.scrollTop = elBottom - container.clientHeight;
  }
}


// Ovo je TV aplikacija — scroll mišem/kotačićem ne treba postojati nigdje, samo
// navigacija strelicama. React od v17 dodaje wheel/touch listenere kao PASSIVE po
// defaultu, pa preventDefault() unutar običnog onWheel propa NEMA efekta (browser ga
// ignorira). Ovaj hook ručno veže native "wheel" listener s { passive: false } preko
// ref callbacka — zakači se točno kad React montira DOM element, neovisno o
// Framer Motion/AnimatePresence tajmingu. Uz callback ref vraća i pravi RefObject na
// isti DOM node (nodeRef) — treba ga djeci (ChannelItem/ProgramRow) da mogu izračunati
// ručni scrollIntoViewNearest bez oslanjanja na closest()/klase. Postojeći programski
// scroll (za praćenje fokusa strelicama) ostaje netaknut, jer to nije scroll mišem.
function useNoWheelRef<T extends HTMLElement>() {
  const nodeRef = useRef<T | null>(null);
  const blockWheel = useCallback((e: WheelEvent) => e.preventDefault(), []);

  const refCallback = useCallback(
    (el: T | null) => {
      if (nodeRef.current) {
        nodeRef.current.removeEventListener("wheel", blockWheel);
      }
      nodeRef.current = el;
      if (el) {
        el.addEventListener("wheel", blockWheel, { passive: false });
      }
    },
    [blockWheel],
  );

  return [refCallback, nodeRef] as const;
}

function calculateProgress(startTime: string, endTime: string): number {
  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  if (current < start || current > end) return Math.min(100, ((Date.now() % 10000) / 10000) * 60 + 20);
  const total = end - start;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, ((current - start) / total) * 100));
}

// Fiksna visina jedne stavke liste kanala (h-11 sadržaj + py-3) — koristi se za
// "spacer" kutije izvan vidljivog okvira, tako da lazy rendering ne mijenja layout.
const CHANNEL_ITEM_HEIGHT = 68;

const ChannelItem = memo(
  ({
    channel,
    isFocused,
    onSelect,
    index,
    showNumber = false,
    lightweight = false,
    scrollContainerRef,
  }: {
    channel: EPGChannel;
    isFocused: boolean;
    onSelect?: (index: number) => void;
    index: number;
    showNumber?: boolean;
    lightweight?: boolean;
    scrollContainerRef?: { current: HTMLElement | null };
  }) => {
    const ref = useRef<HTMLButtonElement>(null);
    const [logoError, setLogoError] = useState(false);

    // Stabilan handler po stavci — roditelj više ne stvara novu closure po renderu,
    // pa React.memo stvarno drži (prije se cijela lista re-renderirala pri svakom
    // pomaku fokusa D-Padom).
    const handleSelect = useCallback(() => {
      onSelect?.(index);
    }, [onSelect, index]);

    useEffect(() => {
      if (isFocused && ref.current && scrollContainerRef?.current) {
        scrollIntoViewNearest(scrollContainerRef.current, ref.current);
      }
    }, [isFocused, scrollContainerRef]);

    useEffect(() => {
      setLogoError(false);
    }, [channel.logoUrl]);

    const className = cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left border border-transparent",
      // Tranzicije se drže samo kad NE svira pozadinski video — na TV-u su
      // paralelne CSS tranzicije po stavci glavni izvor jank-a.
      !lightweight && "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-300",
      isFocused ? "bg-accent/15 border-accent/40" : lightweight ? "bg-transparent" : "bg-transparent hover:bg-muted/20",
    );

    const inner = (
      <>
        {showNumber && (
          <span
            className={cn(
              "flex-shrink-0 min-w-[28px] text-center text-sm font-bold tabular-nums px-1.5 py-0.5 rounded-md border",
              !lightweight && "transition-colors",
              isFocused ? "text-accent border-accent/60 bg-accent/10" : "text-foreground/50 border-border/40",
            )}
          >
            {channel.number}
          </span>
        )}
        <div className="w-16 h-11 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent">
          {channel.logoUrl && !logoError ? (
            <img
              src={channel.logoUrl}
              alt={channel.name}
              decoding="async"
              className="w-full h-full object-contain scale-125"
              loading="eager"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span
              className={cn(
                "text-sm font-bold tracking-wide",
                !lightweight && "transition-colors",
                isFocused ? "text-accent" : "text-foreground/60",
              )}
            >
              {channel.abbreviation}
            </span>
          )}
        </div>
        <span
          className={cn(
            "text-sm font-medium truncate",
            !lightweight && "transition-colors",
            isFocused ? "text-foreground" : "text-foreground/50",
          )}
        >
          {channel.name}
        </span>
      </>
    );

    // Statična varijanta: nefokusirana stavka dok svira pozadinski video —
    // nema Framer Motion animacije ni hover listenera, samo DOM.
    if (lightweight && !isFocused) {
      return (
        <button ref={ref} type="button" onClick={handleSelect} className={className}>
          {inner}
        </button>
      );
    }

    return (
      <motion.button
        ref={ref}
        initial={lightweight ? false : { opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.03 }}
        onClick={handleSelect}
        onMouseEnter={handleSelect}
        className={className}
      >
        {inner}
      </motion.button>
    );
  },
);
ChannelItem.displayName = "ChannelItem";

const ProgramRow = memo(
  ({
    program,
    index,
    isFocused,
    lightweight = false,
    scrollContainerRef,
  }: {
    program: EPGProgram;
    index: number;
    isFocused: boolean;
    lightweight?: boolean;
    scrollContainerRef?: { current: HTMLElement | null };
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const progress = useMemo(
      () => (program.isLive ? calculateProgress(program.startTime, program.endTime) : 0),
      [program.startTime, program.endTime, program.isLive],
    );

    useEffect(() => {
      if (isFocused && ref.current && scrollContainerRef?.current) {
        scrollIntoViewNearest(scrollContainerRef.current, ref.current);
      }
    }, [isFocused, scrollContainerRef]);

    const rowClass = cn(
      "flex items-center gap-4 px-5 py-3 rounded-lg",
      !lightweight && "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200",
      isFocused
        ? "bg-accent/15"
        : program.isLive
          ? "bg-accent/8"
          : lightweight
            ? "bg-transparent"
            : "bg-transparent hover:bg-muted/10",
    );

    const inner = (
      <>
        <span
          className={cn(
            "text-sm font-mono w-14 flex-shrink-0",
            isFocused
              ? "text-accent font-semibold"
              : program.isLive
                ? "text-accent font-semibold"
                : "text-muted-foreground",
          )}
        >
          {program.startTime}
        </span>

        {program.isLive && (
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <Play className="w-3 h-3 fill-current text-accent-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "text-sm block truncate",
              isFocused
                ? "text-foreground font-semibold"
                : program.isLive
                  ? "text-foreground font-semibold"
                  : "text-foreground/70",
            )}
          >
            {program.title}
          </span>
          {program.isLive && (
            <div className="mt-1.5 w-full max-w-[240px] h-[3px] rounded-full bg-muted/30 overflow-hidden">
              {lightweight ? (
                // Statična traka napretka — bez animacijskog loopa dok svira video.
                <div
                  className="h-full w-full origin-left rounded-full bg-accent"
                  style={{ transform: `scaleX(${progress / 100})` }}
                />
              ) : (
                <motion.div
                  className="h-full w-full origin-left rounded-full bg-accent"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: progress / 100 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              )}
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground flex-shrink-0">{program.endTime}</span>

        <span className="hidden text-xs text-muted-foreground/60 flex-shrink-0 w-14 text-right">{program.date}</span>
      </>
    );

    if (lightweight && !isFocused) {
      return (
        <div ref={ref} className={rowClass}>
          {inner}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        initial={lightweight ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.04 }}
        className={rowClass}
      >
        {inner}
      </motion.div>
    );
  },
);
ProgramRow.displayName = "ProgramRow";

const EPGGrid = ({
  channels,
  focusedIndex,
  isFocusActive,
  focusedProgramIndex = 0,
  isProgramFocused = false,
  onChannelClick,
  hideSchedule = false,
  isRadio = false,
  showNumbers = false,
  lightweight = false,
}: EPGGridProps) => {
  const { t } = useTranslation();
  const selectedChannel = isFocusActive || isProgramFocused ? channels[focusedIndex] : channels[0];

  // Refovi koji blokiraju scroll mišem na sva tri scrollable stupca (lista kanala,
  // raspored programa, panel s detaljima) — postojeći scrollIntoViewNearest() u
  // ChannelItem/ProgramRow (za praćenje fokusa strelicama) ostaje netaknut jer je to
  // programski scroll, ne scroll mišem. Uz callback ref za wheel-blokadu, hook vraća i
  // pravi RefObject na kontejner (drugi element niza) — prosljeđuje se djeci kao
  // scrollContainerRef za ručni klampani scroll.
  const [noWheelChannelListRef, channelListNodeRef] = useNoWheelRef<HTMLDivElement>();
  const [noWheelProgramListRef, programListNodeRef] = useNoWheelRef<HTMLDivElement>();
  const [noWheelDetailPanelRef] = useNoWheelRef<HTMLDivElement>();

  // Stabilan handler — jedan za cijelu listu, pa se memoizirane stavke ne
  // re-renderiraju pri svakom pomaku D-Pada.
  const handleChannelSelect = useCallback((index: number) => onChannelClick?.(index), [onChannelClick]);

  // Lazy rendering liste kanala: stavke izvan vidljivog okvira su prazne kutije
  // fiksne visine — layout i scroll pozicije ostaju identični, ali se logotipi i
  // DOM stablo za njih ne grade (bitno na 2GB TV boxu s dugim listama).
  const WINDOW_BEFORE = 8;
  const WINDOW_AFTER = 14;
  const shouldWindow = channels.length > 24;
  const windowStart = shouldWindow ? Math.max(0, focusedIndex - WINDOW_BEFORE) : 0;
  const windowEnd = shouldWindow ? Math.min(channels.length - 1, focusedIndex + WINDOW_AFTER) : channels.length - 1;

  const selectedProgram = useMemo(() => {
    if (!selectedChannel) return undefined;
    if (isProgramFocused) return selectedChannel.programs[focusedProgramIndex];
    return selectedChannel.programs.find((p) => p.isLive) ?? selectedChannel.programs[0];
  }, [selectedChannel, isProgramFocused, focusedProgramIndex]);

  const programDuration = useMemo(() => {
    if (!selectedProgram) return 0;
    const [sh, sm] = selectedProgram.startTime.split(":").map(Number);
    const [eh, em] = selectedProgram.endTime.split(":").map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  }, [selectedProgram]);

  return (
    <motion.div
      initial={lightweight ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-row flex-1 overflow-hidden rounded-xl gap-2"
    >
      {/* Left Column — Channel List */}
      <div
        ref={noWheelChannelListRef}
        className={cn(
          "flex flex-col overflow-y-auto scrollbar-hide pr-0 py-2 flex-shrink-0",
          hideSchedule ? "w-[35%]" : "w-[21%]",
        )}
      >
        <h2 className="text-muted-foreground font-medium text-sm px-4 pb-2">{t("epg.live")}</h2>
        {channels.map((channel, index) => {
          if (index < windowStart || index > windowEnd) {
            return <div key={channel.id} aria-hidden="true" style={{ height: CHANNEL_ITEM_HEIGHT }} />;
          }
          return (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isFocused={isFocusActive && focusedIndex === index}
              onSelect={handleChannelSelect}
              index={index}
              showNumber={showNumbers}
              lightweight={lightweight}
              scrollContainerRef={channelListNodeRef}
            />
          );
        })}
      </div>

      {/* Gold Divider */}
      <div className="w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent flex-shrink-0" />

      {/* Middle Column — Program Guide */}
      {!hideSchedule && (
        <>
          <div
            ref={noWheelProgramListRef}
            className="w-[44%] flex flex-col overflow-y-auto scrollbar-hide py-2 flex-shrink-0"
          >
            <h2 className="text-muted-foreground font-medium text-sm px-5 pb-2">{t("epg.schedule")}</h2>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedChannel?.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col"
              >
                <div className="flex items-center gap-3 px-5 pb-3 mb-1 border-b border-border/20">
                  <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center overflow-hidden">
                    {selectedChannel?.logoUrl ? (
                      <img
                        src={selectedChannel.logoUrl}
                        alt={selectedChannel.name}
                        className="w-full h-full object-contain scale-125"
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-xs font-bold text-accent">{selectedChannel?.abbreviation}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{selectedChannel?.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {t("epg.channel")} {selectedChannel?.number}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 mt-1">
                  {selectedChannel?.programs.map((program, i) => (
                    <ProgramRow
                      key={`${program.title}-${program.startTime}`}
                      program={program}
                      index={i}
                      isFocused={isProgramFocused && focusedProgramIndex === i}
                      lightweight={lightweight}
                      scrollContainerRef={programListNodeRef}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Gold Divider */}
          <div className="w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent flex-shrink-0" />
        </>
      )}
      {/* Right Column — Program Details */}
      <div
        className={cn(
          "flex flex-col justify-center py-2 px-3 overflow-hidden h-full",
          hideSchedule ? "flex-1" : "flex-1",
        )}
      >
        <AnimatePresence mode="wait">
          {selectedProgram && (isProgramFocused || hideSchedule) && (
            <motion.div
              ref={noWheelDetailPanelRef}
              key={`${selectedChannel?.id}-${selectedProgram.title}-${selectedProgram.startTime}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl bg-card border border-border/40 p-6 flex flex-col gap-4 overflow-y-auto scrollbar-hide h-[80%] w-[448px] max-w-full self-center"
            >
              <div className="flex justify-center">
                <div className="w-20 h-12 rounded-md bg-transparent flex items-center justify-center overflow-hidden">
                  {selectedChannel?.logoUrl ? (
                    <img
                      src={selectedChannel.logoUrl}
                      alt={selectedChannel.name}
                      className="w-full h-full object-contain scale-125"
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <span className="text-sm font-bold text-accent tracking-wider">
                      {selectedChannel?.abbreviation}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-2xl font-bold text-foreground leading-tight">{selectedProgram.title}</h3>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {selectedProgram.isLive && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                <span>{selectedProgram.isLive ? t("epg.today") : selectedProgram.date}</span>
                <span>|</span>
                <span>
                  {selectedProgram.startTime} - {selectedProgram.endTime}
                </span>
                {programDuration > 0 && (
                  <>
                    <span>|</span>
                    <span>{programDuration} min</span>
                  </>
                )}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedProgram.description ??
                  t("epg.programDesc", { title: selectedProgram.title, channel: selectedChannel?.name })}
              </p>

              <button className="mt-auto self-center flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-sm px-5 py-2.5 rounded-md transition-colors">
                <Play className="w-4 h-4 fill-current" />
                <span className="tracking-wide">{t(isRadio ? "epg.listen" : "epg.watch")}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default memo(EPGGrid);
