import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getClients, createClient, updateClient, deleteClient } from "@/services/clients";
import { toast } from "sonner";

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: getClients,
  });
}

export function useSaveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: {
      id: string;
      nome: string;
      telefone: string;
      rua: string;
      numero: string;
      bairro: string;
      complemento: string;
      observacoes: string;
    }) => {
      if (!form.nome.trim()) throw new Error("Nome é obrigatório");
      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        rua: form.rua.trim() || null,
        numero: form.numero.trim() || null,
        bairro: form.bairro.trim() || null,
        complemento: form.complemento.trim() || null,
        observacoes: form.observacoes.trim() || null,
      };
      if (form.id) {
        await updateClient(form.id, payload);
      } else {
        await createClient(payload);
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success(variables.id ? "Cliente atualizado!" : "Cliente cadastrado!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success("Cliente removido");
    },
  });
}
