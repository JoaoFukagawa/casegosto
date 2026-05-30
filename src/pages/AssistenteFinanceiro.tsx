import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Send, AlertTriangle, Bot, User as UserIcon, Plus, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import StatsCard from "@/components/StatsCard";
import { DollarSign, TrendingDown, Target, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Bill = {
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  status: "atrasada" | "vence-hoje" | "proxima" | "paga";
  meses_atrasada: number;
  due_date: string | null;
  paid_at: string | null;
};

const CATEGORIAS_SUGESTAO = ["Moradia", "Energia/Água", "Ingredientes", "Transporte", "Internet/Telefone", "Funcionários", "Impostos", "Outros"];

function statusFromDate(dateStr: string): Bill["status"] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  if (d.getTime() < today.getTime()) return "atrasada";
  if (d.getTime() === today.getTime()) return "vence-hoje";
  return "proxima";
}

function mesesAtrasados(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  if (d.getTime() >= today.getTime()) return 0;
  return Math.max(1, (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth()));
}

type ChatMsg = { role: "user" | "assistant"; content: string; time: string };


const META_PADRAO = 5200;

function now() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function prioridadeDe(b: Pick<Bill, "status">): "high" | "medium" | "low" {
  return b.status === "atrasada" ? "high" : b.status === "vence-hoje" ? "medium" : "low";
}

export default function AssistenteFinanceiro() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("painel");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", valor: "", categoria: "Moradia", due_date: format(new Date(), "yyyy-MM-dd") });
  const [meta, setMeta] = useState<number>(() => Number(localStorage.getItem("meta_mensal") ?? META_PADRAO));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [recording, setRecording] = useState(false);

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    setRecording(true);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setRecording(false);
    };
    recognition.onerror = () => {
      toast.error("Erro ao capturar voz. Tente novamente.");
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);
  }
  // Receita do mês (orders)
  const { data: receitaMes = 0 } = useQuery({
    queryKey: ["assistente-receita-mes"],
    queryFn: async () => {
      const ini = startOfMonth(new Date()).toISOString();
      const fim = endOfMonth(new Date()).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("total,status")
        .gte("created_at", ini)
        .lte("created_at", fim);
      if (error) throw error;
      return (data ?? []).filter((o: any) => o.status !== "cancelado").reduce((s: number, o: any) => s + Number(o.total), 0);
    },
  });

  // Contas
  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bills" as any).select("*").order("created_at");
      if (error) throw error;
      return ((data ?? []) as unknown) as Bill[];
    },
  });

  const addBill = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const st = statusFromDate(form.due_date);
      const { error } = await supabase.from("bills" as any).insert({
        user_id: u.user.id,
        nome: form.nome,
        valor: parseFloat(form.valor),
        categoria: form.categoria || "Outros",
        status: st,
        meses_atrasada: mesesAtrasados(form.due_date),
        due_date: form.due_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      setForm({ nome: "", valor: "", categoria: "Moradia", due_date: format(new Date(), "yyyy-MM-dd") });
      setTab("painel");
      toast.success("Conta adicionada!");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao adicionar"),
  });

  const deleteBill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bills" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Conta removida");
    },
  });

  const unpaidBills = bills.filter((b) => b.status !== "paga");
  const totalDividas = unpaidBills.reduce((s, b) => s + Number(b.valor), 0);
  const criticas = unpaidBills.filter((b) => prioridadeDe(b) === "high").length;
  const metaSemana = Math.max(0, Math.round((meta - receitaMes) / 4));
  const progressoPct = meta > 0 ? Math.min(100, Math.round((receitaMes / meta) * 100)) : 0;
  const sorted = [...unpaidBills].sort((a, b) => {
    const o = { high: 0, medium: 1, low: 2 } as const;
    return o[prioridadeDe(a)] - o[prioridadeDe(b)];
  });

  useEffect(() => {
    localStorage.setItem("meta_mensal", String(meta));
  }, [meta]);

  useEffect(() => {
    if (tab === "chat" && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Olá! Sou seu assistente financeiro da marmitaria 🍱. Posso te ajudar a priorizar pagamentos, calcular metas de venda e identificar o que pode esperar. Como posso ajudar hoje?",
          time: now(),
        },
      ]);
    }
  }, [tab, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: ChatMsg = { role: "user", content: msg, time: now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    const contexto = [
      `Receita do mês atual: R$ ${receitaMes.toFixed(2)}`,
      `Meta mensal: R$ ${meta.toFixed(2)}`,
      `Total em dívidas/contas a pagar: R$ ${totalDividas.toFixed(2)}`,
      `Contas críticas (atrasadas): ${criticas}`,
      `Lista de contas: ${unpaidBills.map((b) => `${b.nome} R$${b.valor} (${b.status}${b.meses_atrasada ? `, ${b.meses_atrasada}m` : ""})`).join("; ") || "nenhuma"}`,
    ].join("\n");

    try {
      const { data, error } = await supabase.functions.invoke("assistente-financeiro", {
        body: {
          contexto,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const reply = (data as any)?.reply ?? "Não consegui gerar resposta.";
      const actions = (data as any)?.actions ?? [];
      const paid = (data as any)?.paid ?? [];
      if (actions.length > 0 || paid.length > 0) {
        qc.invalidateQueries({ queryKey: ["bills"] });
        qc.invalidateQueries({ queryKey: ["financeiro-bills"] });
        if (actions.length > 0) toast.success(`${actions.length} conta(s) lançada(s) pela IA`);
        if (paid.length > 0) toast.success(`${paid.length} conta(s) marcada(s) como paga(s)`);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: reply, time: now() }]);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao conectar com a IA");
      setMessages((prev) => [...prev, { role: "assistant", content: "Tive um problema para responder agora. Tente novamente.", time: now() }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold font-heading text-foreground">Assistente Financeiro</h2>
        <p className="text-sm text-muted-foreground">Priorize contas, calcule metas e converse com a IA sobre o caixa da marmitaria.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="painel">📊 Painel</TabsTrigger>
          <TabsTrigger value="chat">💬 Falar com IA</TabsTrigger>
          <TabsTrigger value="contas">➕ Lançar conta</TabsTrigger>
        </TabsList>

        {/* PAINEL */}
        <TabsContent value="painel" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard title="Receita do mês" value={`R$ ${receitaMes.toFixed(2)}`} icon={DollarSign} variant="success" />
            <StatsCard title="Total em dívidas" value={`R$ ${totalDividas.toFixed(2)}`} icon={TrendingDown} variant="warning" />
            <StatsCard title="Meta semanal" value={`R$ ${metaSemana.toFixed(2)}`} icon={Target} />
            <StatsCard title="Contas críticas" value={String(criticas)} icon={AlertCircle} variant={criticas > 0 ? "warning" : "primary"} />
          </div>

          {criticas >= 3 && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Atenção:</strong> Você tem {criticas} contas atrasadas. Priorize luz e água — o corte pode acontecer a qualquer momento e atrapalha a produção das marmitas.
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Prioridade de pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {sorted.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Nenhuma conta cadastrada. Adicione na aba "Lançar conta".</p>
              ) : (
                <div className="space-y-2">
                  {sorted.map((b, i) => {
                    const p = prioridadeDe(b);
                    const dot = p === "high" ? "bg-destructive" : p === "medium" ? "bg-warning" : "bg-success";
                    const badge =
                      p === "high"
                        ? "bg-destructive/10 text-destructive"
                        : p === "medium"
                        ? "bg-warning/10 text-warning-foreground"
                        : "bg-success/10 text-success";
                    const badgeText =
                      b.status === "atrasada"
                        ? b.meses_atrasada > 0
                          ? `${b.meses_atrasada}x atrasada`
                          : "Atrasada"
                        : b.status === "vence-hoje"
                        ? "Vence hoje"
                        : "Próxima";
                    return (
                      <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                        <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}</span>
                        <span className={`h-2 w-2 rounded-full ${dot} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{b.nome}</p>
                          <p className="text-xs text-muted-foreground">{b.categoria}</p>
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge}`}>{badgeText}</span>
                        <span className="text-sm font-bold font-heading text-foreground">R$ {Number(b.valor).toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteBill.mutate(b.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-lg">Progresso mensal</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="meta" className="text-xs text-muted-foreground">Meta R$</Label>
                <Input
                  id="meta"
                  type="number"
                  className="w-28 h-8"
                  value={meta}
                  onChange={(e) => setMeta(Number(e.target.value) || 0)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                R$ {receitaMes.toFixed(2)} arrecadados de R$ {meta.toFixed(2)} necessários
              </p>
              <Progress value={progressoPct} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {progressoPct}% — faltam R$ {Math.max(0, meta - receitaMes).toFixed(2)} para a meta
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHAT */}
        <TabsContent value="chat" className="space-y-3 mt-4">
          <div className="flex flex-wrap gap-2">
            {[
              "Tenho R$400 hoje. Qual conta pago primeiro?",
              "Quanto preciso vender essa semana para pagar o aluguel?",
              "Quais contas posso adiar sem muita consequência?",
            ].map((q) => (
              <Button key={q} variant="outline" size="sm" className="text-xs rounded-full h-7" onClick={() => sendMessage(q)} disabled={loading}>
                {q}
              </Button>
            ))}
          </div>

          <Card>
            <CardContent className="p-4">
              <div ref={scrollRef} className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div className={`max-w-[80%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          m.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted text-foreground"
                        }`}
                      >
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-strong:text-foreground prose-strong:font-bold dark:prose-invert">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          m.content
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">{m.time}</span>
                    </div>
                    {m.role === "user" && (
                      <div className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center flex-shrink-0">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2 justify-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted text-muted-foreground rounded-2xl px-4 py-2.5 text-sm">digitando...</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Pergunte sobre suas contas, prioridades, metas..."
              rows={2}
              className="resize-none"
            />
            <div className="flex flex-col gap-2 self-end">
              <Button
                variant={recording ? "destructive" : "outline"}
                size="icon"
                onClick={startVoice}
                disabled={loading}
                title={recording ? "Ouvindo..." : "Falar por voz"}
              >
                {recording ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4 mr-1" /> Enviar
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* LANÇAR CONTA */}
        <TabsContent value="contas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Nova conta / despesa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nome da conta</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Aluguel, Água..." />
                </div>
                <div className="space-y-1">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" />
                </div>
                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Input
                    list="categorias-sugeridas"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    placeholder="Selecione ou digite uma categoria"
                  />
                  <datalist id="categorias-sugeridas">
                    {CATEGORIAS_SUGESTAO.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <Label>Data de vencimento</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                  {form.due_date && (
                    <p className="text-xs text-muted-foreground">
                      Status automático: <strong>{statusFromDate(form.due_date) === "atrasada" ? "Atrasada" : statusFromDate(form.due_date) === "vence-hoje" ? "Vence hoje" : "Próxima"}</strong>
                    </p>
                  )}
                </div>
              </div>
              <Button onClick={() => addBill.mutate()} disabled={!form.nome || !form.valor || addBill.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar conta
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
