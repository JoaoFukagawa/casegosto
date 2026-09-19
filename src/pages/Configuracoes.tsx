import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Clock, Power } from "lucide-react";
import {
  getStoreSettings, saveStoreSettings, isStoreOpenNow,
  type DayKey, type StoreSettings
} from "@/services/settings";

const DAY_LABELS: Record<DayKey, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAY_ORDER: DayKey[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

export default function Configuracoes() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["store-settings"],
    queryFn: getStoreSettings,
  });

  const [schedule, setSchedule] = useState<StoreSettings["schedule"] | undefined>(undefined);
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (settings) {
      setSchedule(settings.schedule);
      setOverride(settings.store_open_override);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => saveStoreSettings({
      schedule: schedule ?? settings!.schedule,
      store_open_override: override,
    }),
    onSuccess: () => {
      toast.success("Configurações salvas!");
      qc.invalidateQueries({ queryKey: ["store-settings"] });
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  if (isLoading || !settings) return (
    <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
      Carregando...
    </div>
  );

  const currentSchedule = schedule ?? settings.schedule;
  const isOpen = isStoreOpenNow({ schedule: currentSchedule, store_open_override: override });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Gerencie os horários de funcionamento do cardápio online"
      />

      {/* Status atual + override */}
      <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Power className="h-4 w-4 text-[var(--color-accent)]" />
            <h3 className="font-heading font-bold text-[var(--color-text-primary)]">
              Status do cardápio
            </h3>
          </div>

          {/* Indicador de status atual */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${
            isOpen
              ? "border-green-300 bg-green-50"
              : "border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
          }`}>
            <span className={`h-3 w-3 rounded-full ${isOpen ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <div>
              <p className="font-bold text-sm text-[var(--color-text-primary)]">
                {isOpen ? "Aberto agora" : "Fechado agora"}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {override !== null
                  ? override ? "Aberto manualmente (override ativo)" : "Fechado manualmente (override ativo)"
                  : "Seguindo horário configurado"
                }
              </p>
            </div>
          </div>

          {/* Override manual */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Controle manual (sobrescreve o horário)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setOverride(null)}
                className={`flex-1 rounded-xl ${override === null
                  ? "gradient-warm text-white shadow-warm"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                }`}
              >
                Automático
              </Button>
              <Button
                size="sm"
                onClick={() => setOverride(true)}
                className={`flex-1 rounded-xl ${override === true
                  ? "bg-green-600 text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                }`}
              >
                Forçar aberto
              </Button>
              <Button
                size="sm"
                onClick={() => setOverride(false)}
                className={`flex-1 rounded-xl ${override === false
                  ? "bg-[var(--color-danger)] text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                }`}
              >
                Forçar fechado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horários por dia */}
      <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-[var(--color-accent)]" />
            <h3 className="font-heading font-bold text-[var(--color-text-primary)]">
              Horários por dia
            </h3>
          </div>

          <div className="space-y-3">
            {DAY_ORDER.map((day) => {
              const d = currentSchedule[day];
              return (
                <div key={day} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  d.open
                    ? "border-[var(--color-border)] bg-[var(--color-surface)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] opacity-60"
                }`}>
                  {/* Toggle aberto/fechado */}
                  <Switch
                    checked={d.open}
                    onCheckedChange={(val) => setSchedule((prev) => ({
                      ...prev!,
                      [day]: { ...d, open: val }
                    }))}
                  />

                  {/* Nome do dia */}
                  <span className="w-32 text-sm font-semibold text-[var(--color-text-primary)] shrink-0">
                    {DAY_LABELS[day]}
                  </span>

                  {d.open ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={d.start}
                        onChange={(e) => setSchedule((prev) => ({
                          ...prev!,
                          [day]: { ...d, start: e.target.value }
                        }))}
                        className="h-8 text-sm border-[var(--color-border)] bg-[var(--color-surface-secondary)] w-28"
                      />
                      <span className="text-xs text-[var(--color-text-muted)]">até</span>
                      <Input
                        type="time"
                        value={d.end}
                        onChange={(e) => setSchedule((prev) => ({
                          ...prev!,
                          [day]: { ...d, end: e.target.value }
                        }))}
                        className="h-8 text-sm border-[var(--color-border)] bg-[var(--color-surface-secondary)] w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)] flex-1">Fechado</span>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            className="w-full gradient-warm text-white font-heading font-bold rounded-xl mt-2"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? "Salvando..." : "Salvar configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
