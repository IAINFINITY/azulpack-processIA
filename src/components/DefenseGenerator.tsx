
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, Wand2, History, MoreHorizontal, MessageSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Processo } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import DefenseHistory from "./DefenseHistory";
import DefenseEditChat from "./DefenseEditChat";

interface DefenseGeneratorProps {
  processo: Processo;
  onDefenseUpdated: (defesa: string) => void;
}

// Função utilitária para renderizar negrito entre **texto**
function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const DefenseGenerator = ({ processo, onDefenseUpdated }: DefenseGeneratorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDefense, setEditedDefense] = useState(processo.defesa || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEditChat, setShowEditChat] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Atualizar editedDefense quando o processo mudar
  useEffect(() => {
    setEditedDefense(processo.defesa || "");
  }, [processo.defesa]);

  const saveToHistory = async (defenseText: string) => {
    if (!user) return;

    try {
      const { data: nextVersionData } = await supabase
        .rpc('get_next_defense_version', { p_processo_id: processo.id });

      const { error } = await supabase
        .from('defesa_historico')
        .insert([{
          processo_id: processo.id,
          user_id: user.id,
          conteudo: defenseText,
          versao: nextVersionData || 1,
        }]);

      if (error) throw error;
    } catch (error: any) {
      console.error("Erro ao salvar no histórico:", error);
      toast({
        title: "Erro ao salvar no histórico",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const generateDefense = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      const webhookData = {
        action: "createDefense",
        chatInput: "Criar uma sugestão de abordagem para a defesa deste processo trabalhista",
        process_id: processo.id.toString(),
        ask_id: `defense_${Date.now()}`,
        user: user.id,
        session_dify: `defense_session_${processo.id}`
      };

      console.log("Enviando requisição para webhook:", webhookData);

      const response = await fetch('https://webhookauto.iainfinity.com.br/webhook/azulpack_chat_ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na resposta do webhook:", errorText);
        throw new Error(`Erro na requisição: ${response.status} - ${errorText}`);
      }

      // Verificar se a resposta é JSON válido
      const contentType = response.headers.get("content-type");
      console.log("Content-Type da resposta:", contentType);
      
      // Ler o body da resposta apenas uma vez
      const responseText = await response.text();
      console.log("Response text (raw):", responseText);
      
      if (!responseText || responseText.trim().length === 0) {
        throw new Error("Resposta do webhook está vazia");
      }
      
      let data;
      if (contentType && contentType.includes("application/json")) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError: any) {
          console.error("Erro ao fazer parse do JSON:", parseError);
          console.error("Texto que causou erro:", responseText);
          throw new Error(`Resposta do webhook não é um JSON válido: ${parseError.message}`);
        }
      } else {
        // Se não for JSON, usar como texto direto
        data = responseText;
      }
      
      console.log("Response data:", data);
      console.log("Response data type:", typeof data);
      console.log("Response data is array:", Array.isArray(data));
      
      // Processar resposta - assumindo que vem no mesmo formato das mensagens
      let defenseText = "";
      
      if (Array.isArray(data) && data.length > 0) {
        // Processar array de respostas
        const messages = data
          .map(item => {
            // Tentar diferentes campos possíveis
            return item.message || item.text || item.resposta || item.content || 
                   (typeof item === 'string' ? item : JSON.stringify(item));
          })
          .filter(msg => msg && msg.trim().length > 0 && msg !== 'undefined' && msg !== 'null');
        
        defenseText = messages.join(" ").trim();
      } else if (data && typeof data === 'object') {
        // Processar objeto único
        defenseText = data.message || data.text || data.resposta || data.content || 
                     JSON.stringify(data);
      } else if (typeof data === 'string') {
        // Resposta direta como string
        defenseText = data;
      } else {
        // Tentar qualquer campo que possa conter a defesa
        defenseText = data?.resposta || data?.message || data?.text || "";
      }

      // Validar se a defesa não está vazia
      if (!defenseText || defenseText.trim().length === 0 || 
          defenseText === "undefined" || defenseText === "null") {
        throw new Error("A resposta do webhook não contém conteúdo válido");
      }

      // Salvar no histórico antes de atualizar
      await saveToHistory(defenseText);

      // Salvar no banco
      const { error } = await supabase
        .from('processos')
        .update({ defesa: defenseText })
        .eq('id', processo.id);

      if (error) throw error;

      setEditedDefense(defenseText);
      onDefenseUpdated(defenseText);
      
      toast({
        title: "Sugestão de abordagem gerada com sucesso!",
        description: "A sugestão foi gerada e salva automaticamente.",
      });
    } catch (error: any) {
      console.error("Erro ao gerar defesa:", error);
      toast({
        title: "Erro ao gerar sugestão",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const saveDefense = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('processos')
        .update({ defesa: editedDefense })
        .eq('id', processo.id);

      if (error) throw error;

      // Salvar no histórico ao salvar a defesa
      await saveToHistory(editedDefense);

      onDefenseUpdated(editedDefense);
      setIsEditing(false);
      
      toast({
        title: "Defesa salva com sucesso!",
        description: "As alterações foram registradas.",
      });
    } catch (error: any) {
      console.error("Erro ao salvar defesa:", error);
      toast({
        title: "Erro ao salvar defesa",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const restoreVersion = async (defenseText: string) => {
    setIsSaving(true);
    try {
      setEditedDefense(defenseText);

      const { error } = await supabase
        .from('processos')
        .update({ defesa: defenseText })
        .eq('id', processo.id);

      if (error) throw error;

      onDefenseUpdated(defenseText);
      setIsEditing(false);

      toast({
        title: "Versão restaurada com sucesso!",
        description: "A versão selecionada foi restaurada.",
      });
    } catch (error: any) {
      console.error("Erro ao restaurar versão:", error);
      toast({
        title: "Erro ao restaurar versão",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasDefense = processo.defesa && processo.defesa.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gerar Sugestão de Abordagem</h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowHistory(true)}
            variant="outline"
            size="sm"
          >
            <History className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          {hasDefense && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={startEditing}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowEditChat(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Editar pelo Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {!hasDefense && !isEditing ? (
        <>
          <p className="text-muted-foreground">
            A sugestão de abordagem ainda não foi gerada. Clique no botão abaixo para gerar automaticamente.
          </p>
          <Button 
            onClick={generateDefense} 
            disabled={isGenerating}
            className="w-full"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {isGenerating ? "Gerando..." : "Gerar Sugestão de Abordagem"}
          </Button>
        </>
      ) : isEditing ? (
        <>
          <Textarea
            value={editedDefense}
            onChange={(e) => setEditedDefense(e.target.value)}
            placeholder="Edite o conteúdo da defesa..."
            className="min-h-[300px]"
          />
          <div className="flex gap-2">
            <Button 
              onClick={saveDefense} 
              disabled={isSaving}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Defesa"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditing(false);
                setEditedDefense(processo.defesa || "");
              }}
              disabled={isSaving}
            >
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="p-4 rounded-md border">
            <p className="text-foreground whitespace-pre-wrap">
              {renderBold(processo.defesa || "")}
            </p>
          </div>
        </>
      )}

      {/* Modal de Histórico */}
      {showHistory && (
        <DefenseHistory
          processo={processo}
          onRestoreVersion={restoreVersion}
          currentContent={processo.defesa || ""}
        />
      )}

      {/* Modal de Edição pelo Chat */}
      <DefenseEditChat
        open={showEditChat}
        onOpenChange={setShowEditChat}
        processo={processo}
        onDefenseUpdated={onDefenseUpdated}
      />
    </div>
  );
};

export default DefenseGenerator;
