import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User as UserIcon, Mic, Radio } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { sendChatMessage } from "@/services/assistente";
import { queryKeys } from "@/lib/query-keys";

type ChatMsg = { role: "user" | "assistant"; content: string; time: string };

function now() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const quickActions = [
  { label: "Resumo do dia", msg: "Qual foi o resumo financeiro de hoje?" },
  { label: "Contas a pagar", msg: "Quais contas estão pendentes?" },
  { label: "Ganhos vs gastos", msg: "Quanto ganhei vs quanto gastei esse mês?" },
  { label: "O que priorizar", msg: "Quais contas devo pagar primeiro?" },
];

export default function ChatTab({
  messages, setMessages, loading, setLoading, contexto,
}: {
  messages: ChatMsg[]; setMessages: (msgs: ChatMsg[]) => void;
  loading: boolean; setLoading: (v: boolean) => void;
  contexto: string;
}) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [contextSent, setContextSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Olá! Sou seu assistente financeiro da marmitaria 🍱.\n\nTenho acesso a todos os dados do sistema — receitas, despesas, contas a pagar/pagas, pedidos do dia e custos por categoria.\n\n**Pergunte o que quiser:** resumo do dia, contas pendentes, lucro, gastos por categoria, ou peça pra lançar ou pagar contas.`,
        time: now(),
      }]);
    }
  }, []);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    let msgsToSend: { role: string; content: string }[];

    // Send context only on first message
    if (!contextSent) {
      msgsToSend = [
        { role: "system", content: `Você é o assistente financeiro da marmitaria Casegosto. Use os dados abaixo para responder. Você pode lançar contas (usando categoria correta) e marcar contas como pagas.

CATEGORIAS DE CONTAS (use exatamente esses nomes): Moradia, Energia/Água, Ingredientes, Transporte, Internet/Telefone, Funcionários, Impostos, Outros

Para despesas, use: mercado, embalagens, gas, entregador, outros

Sempre classifique na categoria mais adequada. Ex: "conta de luz" → categoria "Energia/Água", "gás de cozinha" → despesa categoria "gas", "compra no mercado" → despesa categoria "mercado".

${contexto}` },
        { role: "user", content: msg },
      ];
      setContextSent(true);
    } else {
      msgsToSend = [...messages.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: msg }];
    }

    setMessages((prev) => [...prev, { role: "user", content: msg, time: now() }]);
    setLoading(true);

    try {
      const data = await sendChatMessage(msgsToSend);
      const reply = (data as any)?.reply ?? "Não consegui gerar resposta.";
      const actions = (data as any)?.actions ?? [];
      const paid = (data as any)?.paid ?? [];
      if (actions.length > 0 || paid.length > 0) {
        qc.invalidateQueries({ queryKey: queryKeys.bills.all });
        qc.invalidateQueries({ queryKey: queryKeys.bills.finance });
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

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error("Seu navegador não suporta reconhecimento de voz"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    setRecording(true);
    recognition.onresult = (e: any) => { setInput(e.results[0][0].transcript); setRecording(false); };
    recognition.onerror = () => { toast.error("Erro ao capturar voz."); setRecording(false); };
    recognition.onend = () => setRecording(false);
  }

  return (
    <div className="flex flex-col h-[600px] rounded-lg border border-border">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Quick actions - only show when no user messages yet */}
        {messages.filter((m) => m.role === "user").length === 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {quickActions.map((a) => (
              <Button key={a.label} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(a.msg)}>
                {a.label}
              </Button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
              <p className="text-xs opacity-60 mt-1 text-right">{m.time}</p>
            </div>
            {m.role === "user" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary flex-shrink-0">
                <UserIcon className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-xl px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={startVoice} className={recording ? "animate-pulse border-primary text-primary" : ""}>
            {recording ? <Radio className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre receitas, despesas, contas..." className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
          <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
