import { useState, useCallback, useRef, useEffect } from "react";
import { useZoneKeys } from "@/lib/focusZone";
import { User, Settings, LogOut, Pencil, ImagePlus, Trash2, Check, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import logo from "@/assets/max-ovizija-logo.png";

interface ProfileSelectionProps {
  onBack: () => void;
  onSelect?: () => void;
  onLogout?: () => void;
  onEditProfile?: (profileId: string) => void;
  onAddProfile?: () => void;
  onRemoveProfile?: (profileId: string) => void;
  onChangeAvatar?: (profileId: string) => void;
}

interface Profile {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
}

const initialProfiles: Profile[] = [{ id: "1", name: "Nomo", color: "bg-primary" }];

type View = "grid" | "editProfile";
type FocusArea = "profiles" | "edit" | "manage" | "logout";

const ProfileSelection = ({
  onBack,
  onSelect,
  onLogout,
  onEditProfile,
  onAddProfile,
  onRemoveProfile,
  onChangeAvatar,
}: ProfileSelectionProps) => {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [view, setView] = useState<View>("grid");
  const [focusArea, setFocusArea] = useState<FocusArea>("profiles");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [editRow, setEditRow] = useState(0);
  const [editCol, setEditCol] = useState(0);

  // Naziv profila koji se trenutno uređuje (draft) i je li input aktivan
  const [nameDraft, setNameDraft] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const totalItems = profiles.length + 1;

  const editingProfile = profiles.find((p) => p.id === editingProfileId);

  // Row layout for the edit/add screen, depends on whether we're editing an
  // existing profile (Remove + Save) or creating a new one (Add only).
  const editRows: string[][] = isNewProfile
    ? [["name", "avatar"], ["add"]]
    : [
        ["name", "avatar"],
        ["remove", "save"],
      ];

  const openEditView = useCallback(
    (profileId: string) => {
      const profile = profiles.find((p) => p.id === profileId);
      setEditingProfileId(profileId);
      setIsNewProfile(false);
      setEditRow(0);
      setEditCol(0);
      setNameDraft(profile?.name ?? "");
      setIsEditingName(false);
      setView("editProfile");
    },
    [profiles],
  );

  const openAddView = useCallback(() => {
    setEditingProfileId(null);
    setIsNewProfile(true);
    setEditRow(0);
    setEditCol(0);
    setNameDraft("Novi profil");
    setIsEditingName(false);
    setView("editProfile");
  }, []);

  const exitEditView = useCallback(() => {
    setView("grid");
    setEditingProfileId(null);
    setIsNewProfile(false);
    setIsEditingName(false);
    setFocusArea("edit");
  }, []);

  // Stvarno uklanjanje profila iz state-a
  const handleRemoveProfile = useCallback(
    (profileId: string) => {
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      setFocusedIndex(0);
      onRemoveProfile?.(profileId);
    },
    [onRemoveProfile],
  );

  // Sprema uneseno ime za postojeći profil
  const handleSaveProfile = useCallback(() => {
    if (!editingProfileId) return;
    const trimmed = nameDraft.trim();
    setProfiles((prev) => prev.map((p) => (p.id === editingProfileId ? { ...p, name: trimmed || p.name } : p)));
    onEditProfile?.(editingProfileId);
  }, [editingProfileId, nameDraft, onEditProfile]);

  // Stvarno dodavanje profila u state, s unesenim imenom
  const handleAddProfile = useCallback(() => {
    const trimmed = nameDraft.trim();
    setProfiles((prev) => {
      const newProfile: Profile = {
        id: Date.now().toString(),
        name: trimmed || `Profil ${prev.length + 1}`,
        color: "bg-primary",
      };
      return [...prev, newProfile];
    });
    setFocusedIndex(0);
    onAddProfile?.();
  }, [nameDraft, onAddProfile]);

  // Ulazak u način unosa imena (fokusira input)
  const startEditingName = useCallback(() => {
    setIsEditingName(true);
  }, []);

  // Potvrda unosa imena (Enter u inputu)
  const confirmNameEdit = useCallback(() => {
    setIsEditingName(false);
  }, []);

  // Otkazivanje unosa imena (Escape u inputu) - vraća prijašnju vrijednost
  const cancelNameEdit = useCallback(() => {
    const fallback = isNewProfile ? "Novi profil" : (editingProfile?.name ?? "");
    setNameDraft(fallback);
    setIsEditingName(false);
  }, [isNewProfile, editingProfile]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const handleGridKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          if (focusArea === "profiles") {
            setFocusedIndex((p) => Math.min(p + 1, totalItems - 1));
          } else if (focusArea === "edit") {
            setFocusedIndex((p) => Math.min(p + 1, profiles.length - 1));
          } else if (focusArea === "manage") {
            setFocusArea("logout");
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (focusArea === "profiles") {
            setFocusedIndex((p) => Math.max(p - 1, 0));
          } else if (focusArea === "edit") {
            setFocusedIndex((p) => Math.max(p - 1, 0));
          } else if (focusArea === "logout") {
            setFocusArea("manage");
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (focusArea === "profiles") {
            if (focusedIndex < profiles.length) {
              setFocusArea("edit");
            } else {
              setFocusArea("manage");
            }
          } else if (focusArea === "edit") {
            setFocusArea("manage");
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (focusArea === "edit") {
            setFocusArea("profiles");
          } else if (focusArea === "manage" || focusArea === "logout") {
            if (focusedIndex < profiles.length) {
              setFocusArea("edit");
            } else {
              setFocusArea("profiles");
            }
          }
          break;
        case "Escape":
        case "Backspace":
          e.preventDefault();
          onBack();
          break;
        case "Enter":
          e.preventDefault();
          if (focusArea === "profiles" && focusedIndex < profiles.length) {
            (onSelect ?? onBack)();
          } else if (focusArea === "profiles" && focusedIndex === profiles.length) {
            openAddView();
          } else if (focusArea === "edit") {
            const profile = profiles[focusedIndex];
            if (profile) openEditView(profile.id);
          } else if (focusArea === "logout") {
            onLogout?.();
          }
          break;
      }
    },
    [focusArea, focusedIndex, totalItems, profiles, onBack, onSelect, onLogout, openEditView, openAddView],
  );

  const handleEditKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Dok se tipka ime, ne presrećemo tipke za navigaciju - samo Enter/Escape
      if (isEditingName) {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmNameEdit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelNameEdit();
        }
        return;
      }

      const currentRow = editRows[editRow] ?? editRows[0];

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setEditCol((c) => Math.min(c + 1, currentRow.length - 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setEditCol((c) => Math.max(c - 1, 0));
          break;
        case "ArrowDown":
          e.preventDefault();
          setEditRow((r) => {
            const nextRow = Math.min(r + 1, editRows.length - 1);
            setEditCol((c) => Math.min(c, editRows[nextRow].length - 1));
            return nextRow;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setEditRow((r) => {
            const nextRow = Math.max(r - 1, 0);
            setEditCol((c) => Math.min(c, editRows[nextRow].length - 1));
            return nextRow;
          });
          break;
        case "Escape":
        case "Backspace":
          e.preventDefault();
          exitEditView();
          break;
        case "Enter": {
          e.preventDefault();
          const action = currentRow[editCol];
          if (action === "name") {
            startEditingName();
          } else if (action === "avatar") {
            if (editingProfileId) onChangeAvatar?.(editingProfileId);
          } else if (action === "remove") {
            if (editingProfileId) handleRemoveProfile(editingProfileId);
            exitEditView();
          } else if (action === "save") {
            handleSaveProfile();
            exitEditView();
          } else if (action === "add") {
            handleAddProfile();
            exitEditView();
          }
          break;
        }
      }
    },
    [
      isEditingName,
      confirmNameEdit,
      cancelNameEdit,
      editRow,
      editCol,
      editRows,
      editingProfileId,
      onChangeAvatar,
      handleRemoveProfile,
      handleSaveProfile,
      handleAddProfile,
      startEditingName,
      exitEditView,
    ],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (view === "editProfile") {
        handleEditKeyDown(e);
      } else {
        handleGridKeyDown(e);
      }
    },
    [view, handleEditKeyDown, handleGridKeyDown],
  );

  useZoneKeys("profile-selection", handleKeyDown, true, 20);

  if (view === "editProfile") {
    const isFocused = (key: string) => editRows[editRow]?.[editCol] === key;
    const hasAvatar = Boolean(editingProfile?.avatarUrl);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="h-screen w-screen bg-transparent relative z-10 flex flex-col items-center justify-center gap-8 px-4"
      >
        {/* Heading */}
        <h1 className="text-3xl font-bold text-foreground">Uredi profil</h1>

        {/* Profile preview */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-44 h-44 rounded-full flex items-center justify-center border-2 bg-accent border-accent shadow-lg shadow-accent/30">
            <User className="w-20 h-20 text-black" />
          </div>
          <span className="text-lg font-medium text-foreground">
            {nameDraft || editingProfile?.name || "Novi profil"}
          </span>
        </div>

        {/* Name / Avatar row */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={startEditingName}
            className={cn(
              "flex flex-col items-start gap-1 px-6 py-4 rounded-xl border transition-all duration-200 text-left",
              isFocused("name")
                ? "bg-muted border-accent ring-2 ring-accent/40"
                : "bg-muted/30 border-border/40 hover:border-border",
            )}
          >
            <span className="text-xs text-muted-foreground">Ime profila</span>
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={confirmNameEdit}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent text-base font-medium text-foreground outline-none border-b border-accent w-full"
                maxLength={30}
              />
            ) : (
              <span className="text-base font-medium text-foreground">{nameDraft || "Novi profil"}</span>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => editingProfileId && onChangeAvatar?.(editingProfileId)}
            className={cn(
              "flex flex-col items-start gap-1 px-6 py-4 rounded-xl border transition-all duration-200 text-left",
              isFocused("avatar")
                ? "bg-muted border-accent ring-2 ring-accent/40"
                : "bg-muted/30 border-border/40 hover:border-border",
            )}
          >
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ImagePlus className="w-3.5 h-3.5" />
              Avatar
            </span>
            <span className="text-base font-medium text-foreground">
              {hasAvatar ? "Zamijeni Avatar" : "Dodaj Avatar"}
            </span>
          </motion.button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4 mt-2">
          {isNewProfile ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                handleAddProfile();
                exitEditView();
              }}
              className={cn(
                "flex items-center gap-3 px-8 py-3 rounded-full transition-all duration-200",
                isFocused("add")
                  ? "bg-muted border border-border ring-2 ring-accent/40"
                  : "bg-muted/40 border border-border/30 hover:bg-muted/60",
              )}
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Dodaj Profil</span>
            </motion.button>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  if (editingProfileId) handleRemoveProfile(editingProfileId);
                  exitEditView();
                }}
                className={cn(
                  "flex items-center gap-3 px-8 py-3 rounded-full transition-all duration-200",
                  isFocused("remove")
                    ? "bg-muted border border-border ring-2 ring-accent/40"
                    : "bg-muted/40 border border-border/30 hover:bg-muted/60",
                )}
              >
                <Trash2 className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Ukloni Profil</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  handleSaveProfile();
                  exitEditView();
                }}
                className={cn(
                  "flex items-center gap-3 px-8 py-3 rounded-full transition-all duration-200",
                  isFocused("save")
                    ? "bg-muted border border-border ring-2 ring-accent/40"
                    : "bg-muted/40 border border-border/30 hover:bg-muted/60",
                )}
              >
                <Check className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Spremi promjene</span>
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="h-screen w-screen bg-transparent relative z-10 flex flex-col items-center justify-center gap-8 px-4"
    >
      {/* Logo area */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <img src={logo} alt="Max Ovizija" className="h-56 w-auto" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-light text-muted-foreground">{t("profile.choose")}</h1>

      {/* Profile cards */}
      <div className="flex flex-wrap justify-center gap-6">
        {profiles.map((profile, index) => {
          const isFocused = focusArea === "profiles" && focusedIndex === index;
          return (
            <div key={profile.id} className="flex flex-col items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  setFocusArea("profiles");
                  setFocusedIndex(index);
                  onSelect?.();
                }}
                className={cn(
                  "w-44 h-44 rounded-full flex items-center justify-center transition-all duration-200 border-2 overflow-hidden",
                  isFocused
                    ? "bg-accent border-accent ring-2 ring-accent/60 shadow-lg shadow-accent/30"
                    : "bg-muted/30 border-border/40 hover:border-border",
                )}
              >
                <User className={cn("w-20 h-20", isFocused ? "text-black" : "text-muted-foreground")} />
              </motion.button>
              <span
                className={cn(
                  "text-base font-medium text-center",
                  isFocused ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {profile.name}
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setFocusArea("edit");
                  setFocusedIndex(index);
                  openEditView(profile.id);
                }}
                aria-label={`Edit ${profile.name}`}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-200",
                  focusArea === "edit" && focusedIndex === index
                    ? "border-accent ring-2 ring-accent/60 bg-muted text-foreground"
                    : "border-border/40 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                <Pencil className="w-4 h-4" />
              </motion.button>
            </div>
          );
        })}

        {/* Add account */}
        {(() => {
          const addIndex = profiles.length;
          const isFocused = focusArea === "profiles" && focusedIndex === addIndex;
          return (
            <div className="flex flex-col items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  setFocusArea("profiles");
                  setFocusedIndex(addIndex);
                  openAddView();
                }}
                className={cn(
                  "w-44 h-44 rounded-full flex items-center justify-center transition-all duration-200 border-2 overflow-hidden",
                  isFocused
                    ? "bg-muted border-border ring-2 ring-accent/40"
                    : "bg-muted/20 border-border/30 hover:border-border/60",
                )}
              >
                <div className="flex items-center">
                  <User className="w-20 h-20 text-muted-foreground" />
                  <span className="text-2xl font-bold text-muted-foreground -ml-1">+</span>
                </div>
              </motion.button>
              <span className="text-sm text-muted-foreground">Add account</span>
            </div>
          );
        })()}
      </div>

      {/* Manage accounts / Logout buttons */}
      <div className="flex items-center gap-4 mt-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => setFocusArea("manage")}
          className={cn(
            "flex items-center gap-3 px-8 py-3 rounded-full transition-all duration-200",
            focusArea === "manage"
              ? "bg-muted border border-border ring-2 ring-accent/40"
              : "bg-muted/40 border border-border/30 hover:bg-muted/60",
          )}
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Manage accounts</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => {
            setFocusArea("logout");
            onLogout?.();
          }}
          className={cn(
            "flex items-center gap-3 px-8 py-3 rounded-full transition-all duration-200",
            focusArea === "logout"
              ? "bg-muted border border-border ring-2 ring-accent/40"
              : "bg-muted/40 border border-border/30 hover:bg-muted/60",
          )}
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Logout</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProfileSelection;
