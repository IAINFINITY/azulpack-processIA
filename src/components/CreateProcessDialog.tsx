import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FileUpload from "./FileUpload";
import { Processo } from "@/types";

interface CreateProcessDialogProps {
  onProcessCreated: () => void;
  processo?: Processo;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CreateProcessDialog = ({ onProcessCreated, processo, open, onOpenChange }: CreateProcessDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    titulo: processo?.titulo || "",
    numero_processo: processo?.numero_processo || "",
    descricao: processo?.descricao || "",
    arquivos_url: processo?.arquivos_url || [],
    status: processo?.status || "andamento"
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Use controlled or uncontrolled state based on props
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  useEffect(() => {
    if (processo) {
      setFormData({
        titulo: processo.titulo || "",
        numero_processo: processo.numero_processo || "",
        descricao: processo.descricao || "",
        arquivos_url: processo.arquivos_url || [],
        status: processo.status || "andamento"
      });
    }
  }, [processo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar ou editar um processo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const isEdit = !!processo;

    try {
      let processoId = processo?.id;
      let resultProcesso = processo;
      if (isEdit) {
        // Atualizar processo existente
        const { error } = await supabase
          .from('processos')
          .update({
            titulo: formData.titulo,
            numero_processo: formData.numero_processo,
            descricao: formData.descricao,
            arquivos_url: formData.arquivos_url,
            status: formData.status
          })
          .eq('id', processoId);
        if (error) throw error;
      } else {
        // Criar novo processo
        const { data: newProc, error } = await supabase
          .from('processos')
          .insert([{
            titulo: formData.titulo,
            numero_processo: formData.numero_processo,
            descricao: formData.descricao,
            arquivos_url: formData.arquivos_url,
            user_id: user.id,
            status: formData.status
          }])
          .select()
          .single();
        if (error) throw error;
        processoId = newProc.id;
        resultProcesso = newProc;

        // Disparar webhook informando dados do processo criado
        try {
          const webhookPayload = {
            action: "createProcess",
            process_id: newProc.id?.toString?.() ?? String(newProc.id),
            titulo: newProc.titulo,
            numero_processo: newProc.numero_processo,
            status: newProc.status,
            user: user.id,
          };

          await fetch('https://webhookauto.iainfinity.com.br/webhook/azulpack_chat_ia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          }).catch(() => {});
        } catch (_) {
          // Ignorar erro do webhook para não bloquear a criação
        }
      }
      // Upload de arquivos (igual antes)
      if (selectedFiles.length > 0 && processoId) {
        setUploadingFile(true);
        const uploadedUrls: string[] = [];
        try {
          for (const file of selectedFiles) {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            formDataUpload.append('processo_id', processoId.toString());
            const response = await fetch('https://webhookauto.iainfinity.com.br/webhook/azulpack_file', {
              method: 'POST',
              body: formDataUpload,
            });
            if (!response.ok) {
              throw new Error('Falha ao fazer upload do arquivo');
            }
            const data = await response.json();
            uploadedUrls.push(data.url);
          }
          // Atualizar o processo com as URLs dos arquivos
          const { error: updateError } = await supabase
            .from('processos')
            .update({ arquivos_url: uploadedUrls })
            .eq('id', processoId);
          if (updateError) throw updateError;
          toast({
            title: isEdit ? "Processo atualizado com sucesso!" : "Processo criado com sucesso!",
            description: "O processo e os arquivos foram processados com sucesso.",
          });
        } catch (error: unknown) {
          console.error("Erro ao fazer upload dos arquivos:", error);
          toast({
            title: "Atenção",
            description: isEdit ? "O processo foi atualizado, mas houve um erro ao processar alguns arquivos." : "O processo foi criado, mas houve um erro ao processar alguns arquivos.",
            variant: "destructive",
          });
        } finally {
          setUploadingFile(false);
        }
      } else {
        toast({
          title: isEdit ? "Processo atualizado com sucesso!" : "Processo criado com sucesso!",
          description: isEdit ? "O processo foi atualizado." : "O novo processo foi adicionado à lista.",
        });
      }
      setFormData({ titulo: "", numero_processo: "", descricao: "", arquivos_url: [], status: "andamento" });
      setSelectedFiles([]);
      setOpen(false);
      onProcessCreated();
    } catch (error: unknown) {
      console.error(isEdit ? "Erro ao atualizar processo:" : "Erro ao criar processo:", error);
      toast({
        title: isEdit ? "Erro ao atualizar processo" : "Erro ao criar processo",
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            {processo ? null : <Plus className="h-4 w-4" />}
            {processo ? "Editar" : "Novo Processo"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{processo ? "Editar Processo" : "Criar Novo Processo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título do Processo *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => handleInputChange("titulo", e.target.value)}
              placeholder="Ex: Rescisão indireta por assédio moral"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero_processo">Número do Processo</Label>
            <Input
              id="numero_processo"
              value={formData.numero_processo}
              onChange={(e) => handleInputChange("numero_processo", e.target.value)}
              placeholder="Ex: 0001234-56.2024.5.02.0001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange("descricao", e.target.value)}
              placeholder="Breve descrição do processo..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status do Processo</Label>
            <select
              id="status"
              value={formData.status}
              onChange={e => handleInputChange("status", e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              required
            >
              <option value="andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Arquivos do Processo</Label>
            <FileUpload onFilesSelected={handleFilesSelected} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading || uploadingFile}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploadingFile}>
              {loading ? (processo ? "Salvando..." : "Criando...") : uploadingFile ? "Processando arquivos..." : processo ? "Salvar" : "Criar Processo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProcessDialog;
