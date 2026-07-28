import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/PageHeader";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import SummaryTab from "@/components/financeiro/SummaryTab";
import BillsTab from "@/components/financeiro/BillsTab";
import Pagamentos from "@/pages/Pagamentos";

export default function Financeiro() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        subtitle={`Controle de custos, receitas e lucro — ${format(parseISO(selectedDate), "MMMM 'de' yyyy", { locale: ptBR })}`}
        actions={
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[180px]" />
          </div>
        }
      />

      <SummaryTab selectedDate={selectedDate} />

      <BillsTab selectedDate={selectedDate} />

      <Pagamentos />
    </div>
  );
}
