import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Edit, Save, Wand2 } from "lucide-react";
import { Processo } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SummaryManagerProps {
  processo: Processo;
  onSummaryUpdated: (resumo: string) => void;
}

// Função utilitária para renderizar negrito entre **texto**
function renderBold(text: string) {
  // Substitui **texto** por <strong>texto</strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const SummaryManager = ({ processo, onSummaryUpdated }: SummaryManagerProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(processo.resumo || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const generateSummary = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      const webhookData = {
        action: "createSummary",
        chatInput: "gerarResumo",
        process_id: processo.id.toString(),
        ask_id: `summary_${Date.now()}`,
        user: user.id,
        session_dify: `summary_session_${processo.id}`
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
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

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
      let summaryText = "";
      
      if (Array.isArray(data) && data.length > 0) {
        // Processar array de respostas
        const messages = data
          .map(item => {
            // Tentar diferentes campos possíveis
            return item.message || item.text || item.resposta || item.content || 
                   (typeof item === 'string' ? item : JSON.stringify(item));
          })
          .filter(msg => msg && msg.trim().length > 0 && msg !== 'undefined' && msg !== 'null');
        
        summaryText = messages.join(" ").trim();
      } else if (data && typeof data === 'object') {
        // Processar objeto único
        summaryText = data.message || data.text || data.resposta || data.content || 
                      data.summary || JSON.stringify(data);
      } else if (typeof data === 'string') {
        // Resposta direta como string
        summaryText = data;
      } else {
        // Tentar qualquer campo que possa conter o resumo
        summaryText = data?.resposta || data?.message || data?.text || "";
      }

      // Validar se o resumo não está vazio
      if (!summaryText || summaryText.trim().length === 0 || 
          summaryText === "undefined" || summaryText === "null") {
        console.error("Resposta do webhook está vazia ou inválida:", data);
        throw new Error("O webhook retornou uma resposta vazia ou inválida. Tente novamente.");
      }

      console.log("Resumo processado:", summaryText.substring(0, 100) + "...");

      // Salvar no banco
      const { error } = await supabase
        .from('processos')
        .update({ resumo: summaryText })
        .eq('id', processo.id);

      if (error) throw error;

      setEditedSummary(summaryText);
      onSummaryUpdated(summaryText);
      
      toast({
        title: "Resumo gerado com sucesso!",
        description: "O resumo foi gerado e salvo automaticamente.",
      });
    } catch (error: any) {
      console.error("Erro ao gerar resumo:", error);
      toast({
        title: "Erro ao gerar resumo",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = async () => {
    if (!user) return;

    setIsEditing(true);
    
    // Enviar requisição para editar resumo
    try {
      const webhookData = {
        action: "updateSummary",
        chatInput: processo.resumo || "",
        process_id: processo.id.toString(),
        ask_id: `edit_summary_${Date.now()}`,
        user: user.id,
        session_dify: `edit_summary_session_${processo.id}`
      };

      console.log("Enviando requisição para editar resumo:", webhookData);

      // Fazer requisição para o webhook mas não esperar resposta para permitir edição imediata
      fetch('https://webhookauto.iainfinity.com.br/webhook/azulpack_chat_ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      }).catch(error => {
        console.log("Webhook call for edit summary:", error);
      });
    } catch (error) {
      console.log("Error calling webhook for edit:", error);
    }
  };

  const saveSummary = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('processos')
        .update({ resumo: editedSummary })
        .eq('id', processo.id);

      if (error) throw error;

      onSummaryUpdated(editedSummary);
      setIsEditing(false);
      
      toast({
        title: "Resumo salvo com sucesso!",
        description: "As alterações foram registradas.",
      });
    } catch (error: any) {
      console.error("Erro ao salvar resumo:", error);
      toast({
        title: "Erro ao salvar resumo",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasSummary = processo.resumo && processo.resumo.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resumo do Processo
          </CardTitle>
          <Button onClick={startEditing} variant="outline" className="font-semibold px-5">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!hasSummary && !isEditing ? (
            <>
              <p className="text-muted-foreground">
                O resumo ainda não foi gerado. Clique no botão abaixo para gerar automaticamente um resumo baseado nas informações do processo.
              </p>
              <Button 
                onClick={generateSummary} 
                disabled={isGenerating}
                className="w-full"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {isGenerating ? "Gerando Resumo..." : "Gerar Resumo"}
              </Button>
            </>
          ) : isEditing ? (
            <>
              <Textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                placeholder="Edite o conteúdo do resumo..."
                className="min-h-[200px]"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={saveSummary} 
                  disabled={isSaving}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Salvando..." : "Salvar Resumo"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditedSummary(processo.resumo || "");
                  }}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-md">
                <p className="text-foreground whitespace-pre-wrap">
                  {renderBold(processo.resumo || "")}
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryManager;
