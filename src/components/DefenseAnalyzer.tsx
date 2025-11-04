
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, History, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Processo, DefenseAnalysisItem } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import DefenseAnalysisHistory from "./DefenseAnalysisHistory";

interface DefenseAnalyzerProps {
  processo: Processo;
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

const DefenseAnalyzer = ({ processo }: DefenseAnalyzerProps) => {
  const [currentAnalysis, setCurrentAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<DefenseAnalysisItem[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadAnalysisHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('analise_defesa')
        .select('*')
        .eq('processo_id', processo.id)
        .order('versao', { ascending: false });

      if (error) throw error;
      
      setAnalysisHistory(data || []);
      // Definir a análise mais recente como atual
      if (data && data.length > 0) {
        setCurrentAnalysis(data[0].conteudo_analise);
      }
    } catch (error: any) {
      console.error("Erro ao carregar histórico de análises:", error);
      toast({
        title: "Erro ao carregar histórico",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadAnalysisHistory();
  }, [processo.id]);

  const saveAnalysisToHistory = async (analysisText: string, defenseText: string) => {
    if (!user) return;

    try {
      const { data: nextVersionData } = await supabase
        .rpc('get_next_analysis_version', { p_processo_id: processo.id });

      const { error } = await supabase
        .from('analise_defesa')
        .insert([{
          processo_id: processo.id,
          user_id: user.id,
          conteudo_analise: analysisText,
          defesa_analisada: defenseText,
          versao: nextVersionData || 1,
        }]);

      if (error) throw error;
      
      // Recarregar histórico
      await loadAnalysisHistory();
    } catch (error: any) {
      console.error("Erro ao salvar análise no histórico:", error);
      toast({
        title: "Erro ao salvar análise",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const analyzeDefense = async () => {
    if (!user) return;

    if (!processo.defesa || processo.defesa.trim().length === 0) {
      toast({
        title: "Nenhuma defesa encontrada",
        description: "É necessário ter uma defesa gerada antes de analisá-la.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const webhookData = {
        action: "analisarDefesa",
        chatInput: "analisarDefesa",
        process_id: processo.id.toString(),
        ask_id: `analysis_${Date.now()}`,
        user: user.id,
        session_dify: `analysis_session_${processo.id}`
      };

      console.log("Enviando requisição para análise:", webhookData);

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
      let analysisText = "";
      
      if (Array.isArray(data) && data.length > 0) {
        // Processar array de respostas
        const messages = data
          .map(item => {
            // Tentar diferentes campos possíveis
            return item.message || item.text || item.resposta || item.content || 
                   (typeof item === 'string' ? item : JSON.stringify(item));
          })
          .filter(msg => msg && msg.trim().length > 0 && msg !== 'undefined' && msg !== 'null');
        
        analysisText = messages.join(" ").trim();
      } else if (data && typeof data === 'object') {
        // Processar objeto único
        analysisText = data.message || data.text || data.resposta || data.content || 
                      JSON.stringify(data);
      } else if (typeof data === 'string') {
        // Resposta direta como string
        analysisText = data;
      } else {
        // Tentar qualquer campo que possa conter a análise
        analysisText = data?.resposta || data?.message || data?.text || "";
      }

      // Validar se a análise não está vazia
      if (!analysisText || analysisText.trim().length === 0 || 
          analysisText === "undefined" || analysisText === "null") {
        throw new Error("A resposta do webhook não contém conteúdo válido");
      }

      // Salvar análise no histórico
      await saveAnalysisToHistory(analysisText, processo.defesa);
      
      setCurrentAnalysis(analysisText);
      
      toast({
        title: "Análise da defesa gerada com sucesso!",
        description: "A análise foi gerada e salva automaticamente.",
      });
    } catch (error: any) {
      console.error("Erro ao analisar defesa:", error);
      toast({
        title: "Erro ao analisar defesa",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasDefense = processo.defesa && processo.defesa.trim().length > 0;
  const hasAnalysis = currentAnalysis && currentAnalysis.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analisar Defesa</h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowHistory(true)}
            variant="outline"
            size="sm"
          >
            <History className="h-4 w-4 mr-2" />
            Histórico de Análises
          </Button>
        </div>
      </div>

      {/* Análise da Defesa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análise da Defesa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnalysis ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                A análise da defesa ainda não foi gerada. Clique no botão abaixo para analisar a defesa atual.
              </p>
              <Button 
                onClick={analyzeDefense} 
                disabled={isAnalyzing || !hasDefense}
                className="w-full"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {isAnalyzing ? "Analisando..." : "Analisar Defesa"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-md border">
                <p className="text-foreground whitespace-pre-wrap">
                  {renderBold(currentAnalysis)}
                </p>
              </div>
              <Button 
                onClick={analyzeDefense} 
                disabled={isAnalyzing || !hasDefense}
                className="w-full"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {isAnalyzing ? "Analisando..." : "Gerar Nova Análise"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Histórico de Análises */}
      <DefenseAnalysisHistory
        processo={processo}
        analysisHistory={analysisHistory}
        onAnalysisSelected={setCurrentAnalysis}
        open={showHistory}
        onOpenChange={setShowHistory}
      />
    </div>
  );
};

export default DefenseAnalyzer;
