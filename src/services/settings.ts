import { supabase } from "@/integrations/supabase/client";

const OWNER_USER_ID = "f6dd0c90-a2e6-4df9-8a30-1f7bcddd4e3e";

export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type DaySchedule = {
  open: boolean;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
};

export type StoreSchedule = Record<DayKey, DaySchedule>;

export type StoreSettings = {
  schedule: StoreSchedule;
  store_open_override: boolean | null;
};

const DEFAULT_SCHEDULE: StoreSchedule = {
  monday:    { open: true,  start: "10:00", end: "14:00" },
  tuesday:   { open: true,  start: "10:00", end: "14:00" },
  wednesday: { open: true,  start: "10:00", end: "14:00" },
  thursday:  { open: true,  start: "10:00", end: "14:00" },
  friday:    { open: true,  start: "10:00", end: "14:00" },
  saturday:  { open: false, start: "10:00", end: "14:00" },
  sunday:    { open: false, start: "10:00", end: "14:00" },
};

export async function getStoreSettings(): Promise<StoreSettings> {
  const { data } = await supabase
    .from("store_settings")
    .select("schedule, store_open_override")
    .eq("user_id", OWNER_USER_ID)
    .single();

  if (!data) return { schedule: DEFAULT_SCHEDULE, store_open_override: null };
  return {
    schedule: data.schedule as StoreSchedule,
    store_open_override: data.store_open_override,
  };
}

export async function saveStoreSettings(settings: StoreSettings) {
  const { data: existing } = await supabase
    .from("store_settings")
    .select("id")
    .eq("user_id", OWNER_USER_ID)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("store_settings")
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("user_id", OWNER_USER_ID);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("store_settings")
      .insert({ ...settings, user_id: OWNER_USER_ID });
    if (error) throw error;
  }
}

// Retorna se o cardápio está aberto agora
export function isStoreOpenNow(settings: StoreSettings): boolean {
  // Override manual tem prioridade
  if (settings.store_open_override === true) return true;
  if (settings.store_open_override === false) return false;

  const now = new Date();
  const days: DayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayKey = days[now.getDay()];
  const day = settings.schedule[todayKey];

  if (!day.open) return false;

  const [startH, startM] = day.start.split(":").map(Number);
  const [endH, endM] = day.end.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
