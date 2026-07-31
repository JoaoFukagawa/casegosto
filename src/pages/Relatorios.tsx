import PageHeader from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ExpenseReport from "@/components/relatorios/ExpenseReport";
import SalesReport from "@/components/relatorios/SalesReport";
import InactiveClientsReport from "@/components/relatorios/InactiveClientsReport";

export default function Relatorios() {
  return (
    <div className="space-y-2">
      <PageHeader title="Relatórios" subtitle="Análise detalhada por período" />
      <Tabs defaultValue="despesas">
        <TabsList>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="clientes">Clientes Inativos</TabsTrigger>
        </TabsList>
        <TabsContent value="despesas"><ExpenseReport /></TabsContent>
        <TabsContent value="vendas"><SalesReport /></TabsContent>
        <TabsContent value="clientes"><InactiveClientsReport /></TabsContent>
      </Tabs>
    </div>
  );
}
