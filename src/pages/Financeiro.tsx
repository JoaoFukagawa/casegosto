import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/PageHeader";
import { CalendarDays, Bot, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SummaryTab from "@/components/financeiro/SummaryTab";
import PlanoContasTab from "@/components/financeiro/PlanoContasTab";
import BillsTab from "@/components/financeiro/BillsTab";
import ChatTab from "@/components/assistente/ChatTab";
import Pagamentos from "@/pages/Pagamentos";

type ChatMsg = { role: "user" | "assistant"; content: string; time: string };

export default function Financeiro() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [assistenteAberto, setAssistenteAberto] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        subtitle={`Controle de custos, receitas e lucro — ${format(parseISO(selectedDate), "MMMM 'de' yyyy", { locale: ptBR })}`}
        actions={
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[180px]" />
            <Button
              variant={assistenteAberto ? "default" : "outline"}
              size="sm"
              onClick={() => setAssistenteAberto((v) => !v)}
            >
              {assistenteAberto ? <X className="h-4 w-4 mr-1.5" /> : <Bot className="h-4 w-4 mr-1.5" />}
              Assistente IA
            </Button>
          </div>
        }
      />

      <div className={assistenteAberto ? "grid gap-6 lg:grid-cols-[1fr_380px] items-start" : ""}>
        <div className="space-y-6 min-w-0">
          <SummaryTab selectedDate={selectedDate} />
          <PlanoContasTab selectedDate={selectedDate} />
          <BillsTab selectedDate={selectedDate} />
          <Pagamentos />
        </div>

        {assistenteAberto && (
          <div className="lg:sticky lg:top-4">
            <ChatTab messages={messages} setMessages={setMessages} loading={loading} setLoading={setLoading} contexto="" />
          </div>
        )}
      </div>
    </div>
  );
}
