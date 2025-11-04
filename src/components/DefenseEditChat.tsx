import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Loader2, Save, Sparkles, MessageSquare, Copy, Check, X, Bot, User, Plus, Edit, Trash2, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Processo } from "@/types";

interface DefenseEditChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo: Processo;
  onDefenseUpdated: (defesa: string) => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface SugestaoPrompt {
  id: number;
  prompt_text: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PROMPTS = [
  "Adicione argumentos sobre direitos trabalhistas",
  "Reformule para um tom mais formal",
  "Inclua jurisprudência relevante",
  "Simplifique a linguagem técnica",
  "Adicione mais detalhes sobre as provas"
];

const DefenseEditChat = ({ open, onOpenChange, processo, onDefenseUpdated }: DefenseEditChatProps) => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [latestDefense, setLatestDefense] = useState(processo.defesa || "");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [sugestoes, setSugestoes] = useState<SugestaoPrompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<number | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [editedPromptText, setEditedPromptText] = useState("");
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/html",
      "image/png",
      "image/jpeg",
      "image/gif"
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Arquivo não permitido",
        description: "Selecione apenas PDF, DOC, DOCX, TXT, HTML ou imagens.",
        variant: "destructive",
      });
      return;
    }

    // Aqui você chama a função de upload para o Supabase Storage
    uploadFile(file);
  };



  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar sugestões de prompts quando o componente montar
  useEffect(() => {
    if (open && user) {
      loadSugestoes();
    }
  }, [open, user]);

  const loadSugestoes = async () => {
    if (!user) return;

    setLoadingPrompts(true);
    try {
      const { data, error } = await supabase
        .from('sugestoes_prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Se não há sugestões, inserir as padrão
      if (!data || data.length === 0) {
        await createDefaultPrompts();
      } else {
        setSugestoes(data);
      }
    } catch (error: any) {
      console.error("Erro ao carregar sugestões:", error);
      toast({
        title: "Erro ao carregar sugestões",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoadingPrompts(false);
    }
  };

  const createDefaultPrompts = async () => {
    if (!user) return;

    try {
      const promptsToInsert = DEFAULT_PROMPTS.map(prompt => ({
        user_id: user.id,
        prompt_text: prompt
      }));

      const { data, error } = await supabase
        .from('sugestoes_prompts')
        .insert(promptsToInsert)
        .select();

      if (error) throw error;

      setSugestoes(data || []);
    } catch (error: any) {
      console.error("Erro ao criar prompts padrão:", error);
    }
  };

  const addNewPrompt = async () => {
    if (!user || !newPrompt.trim()) return;

    try {
      const { data, error } = await supabase
        .from('sugestoes_prompts')
        .insert({
          user_id: user.id,
          prompt_text: newPrompt.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setSugestoes(prev => [...prev, data]);
      setNewPrompt("");

      toast({
        title: "Prompt adicionado!",
        description: "Nova sugestão de prompt foi criada.",
      });
    } catch (error: any) {
      console.error("Erro ao adicionar prompt:", error);
      toast({
        title: "Erro ao adicionar prompt",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const updatePrompt = async (id: number) => {
    if (!editedPromptText.trim()) return;

    try {
      const { data, error } = await supabase
        .from('sugestoes_prompts')
        .update({
          prompt_text: editedPromptText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSugestoes(prev => prev.map(s => s.id === id ? data : s));
      setEditingPrompt(null);
      setEditedPromptText("");

      toast({
        title: "Prompt atualizado!",
        description: "Sugestão de prompt foi editada com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar prompt:", error);
      toast({
        title: "Erro ao atualizar prompt",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const deletePrompt = async (id: number) => {
    try {
      const { error } = await supabase
        .from('sugestoes_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSugestoes(prev => prev.filter(s => s.id !== id));

      toast({
        title: "Prompt removido!",
        description: "Sugestão de prompt foi excluída.",
      });
    } catch (error: any) {
      console.error("Erro ao deletar prompt:", error);
      toast({
        title: "Erro ao deletar prompt",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={index}>{boldText}</strong>;
      }
      return part;
    });
  };
  const uploadFile = async (file: File) => {
    if (!file) return null;

    const fileName = `${Date.now()}_${file.name}`;

    // Upload do arquivo
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('arquivos')
      .upload(fileName, file);

    if (uploadError) {
      console.error("Erro ao fazer upload do arquivo:", uploadError);
      toast({
        title: "Erro ao enviar arquivo",
        description: uploadError.message || "Tente novamente.",
        variant: "destructive",
      });
      return null;
    }

    // Obter URL pública
    const { data } = supabase.storage.from('arquivos').getPublicUrl(fileName);
    // data.publicUrl é a URL que queremos
    return data.publicUrl;
  };


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !selectedFile) || loading || !user) return;

    setLoading(true);

    try {
      let fileBase64: string | null = null;
      let fileType: "text" | "image" | "pdf" | "docx" | "html" | "other" = "text";

      if (selectedFile) {
        // Determina o tipo do arquivo
        if (selectedFile.type.startsWith("image")) {
          fileType = "image";
        } else if (selectedFile.type === "application/pdf") {
          fileType = "pdf";
        } else if (
          selectedFile.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          fileType = "docx";
        } else if (
          selectedFile.type === "text/html" ||
          selectedFile.name.endsWith(".html")
        ) {
          fileType = "html";
        } else {
          fileType = "other";
        }

        // Converte arquivo para Base64
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1] || result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      let messageContent = "";

      if (inputValue && selectedFile) {
        // Tem texto e arquivo → texto + quebra de linha + nome completo do arquivo
        messageContent = `${inputValue}\n\n${selectedFile.name}`;
      } else if (selectedFile) {
        // Só arquivo → nome cortado se for muito longo
        const maxLength = 20;
        const name = selectedFile.name;
        messageContent = "📎" + (name.length > maxLength ? name.slice(0, maxLength) + "..." : name);
      } else {
        // Só texto → usa o inputValue
        messageContent = inputValue;
      }

      // Mensagem local
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "user",
          content: messageContent,
          timestamp: new Date(),
          fileType,
          fileName: selectedFile?.name || null,
          fileBase64,
        },
      ]);


      // Limpa input e arquivo selecionado
      setInputValue("");
      setSelectedFile(null);

      // Monta payload para webhook
      const webhookPayload = {
        chatInput: inputValue,      // texto principal
        action: "editDefense",
        process_id: processo.id.toString(),
        ask_id: `edit_defense_${Date.now()}`,
        user: user.id,
        session_dify: `edit_defense_session_${processo.id}`,
        fileType,
        fileName: selectedFile?.name || null,
        fileBase64,             // PDF deve ficar aqui no topo
      };



      // Envia para o webhook
      const response = await fetch('https://webhookauto.iainfinity.com.br/webhook/azulpack_chat_ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
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
      
      let responseData;
      if (contentType && contentType.includes("application/json")) {
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError: any) {
          console.error("Erro ao fazer parse do JSON:", parseError);
          console.error("Texto que causou erro:", responseText);
          throw new Error(`Resposta do webhook não é um JSON válido: ${parseError.message}`);
        }
      } else {
        // Se não for JSON, usar como texto direto
        responseData = responseText;
      }
      
      console.log("Response data:", responseData);
      console.log("Response data type:", typeof responseData);
      console.log("Response data is array:", Array.isArray(responseData));

      // Recebe resposta da IA
      let allAiContent: string[] = [];
      
      if (Array.isArray(responseData) && responseData.length > 0) {
        responseData.forEach((item, index) => {
          const content = item.message || item.text || item.resposta || item.content || 
                         (typeof item === 'string' ? item : JSON.stringify(item));
          
          if (content && content.trim().length > 0 && content !== 'undefined' && content !== 'null') {
            allAiContent.push(content);
            const aiMessage: ChatMessage = {
              id: `${Date.now()}_${index}`,
              type: 'ai',
              content: content,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMessage]);
          }
        });
      } else if (responseData && typeof responseData === 'object') {
        // Processar objeto único
        const content = responseData.message || responseData.text || responseData.resposta || 
                       responseData.content || JSON.stringify(responseData);
        
        if (content && content.trim().length > 0 && content !== 'undefined' && content !== 'null') {
          allAiContent.push(content);
          const aiMessage: ChatMessage = {
            id: `${Date.now()}_0`,
            type: 'ai',
            content: content,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);
        }
      } else if (typeof responseData === 'string' && responseData.trim().length > 0) {
        // Resposta direta como string
        allAiContent.push(responseData);
        const aiMessage: ChatMessage = {
          id: `${Date.now()}_0`,
          type: 'ai',
          content: responseData,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
      
      // Atualizar latestDefense com o conteúdo da resposta da IA
      if (allAiContent.length > 0) {
        const newDefenseContent = allAiContent.join('\n\n').trim();
        setLatestDefense(newDefenseContent);
      }

    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro ao processar solicitação",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



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

  const handleRegisterDefense = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('processos')
        .update({ defesa: latestDefense })
        .eq('id', processo.id);

      if (error) throw error;

      // Salvar no histórico antes de atualizar
      await saveToHistory(latestDefense);

      onDefenseUpdated(latestDefense);
      onOpenChange(false);

      toast({
        title: "Defesa registrada com sucesso!",
        description: "A defesa foi atualizada e salva.",
      });

      // Limpar o chat para a próxima sessão
      setMessages([]);
      setLatestDefense(processo.defesa || "");
    } catch (error: any) {
      console.error("Erro ao registrar defesa:", error);
      toast({
        title: "Erro ao registrar defesa",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt);
    textareaRef.current?.focus();
  };

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      toast({
        title: "Copiado!",
        description: "Mensagem copiada para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem.",
        variant: "destructive",
      });
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setLatestDefense(processo.defesa || "");
  };

  const startEditingPrompt = (prompt: SugestaoPrompt) => {
    setEditingPrompt(prompt.id);
    setEditedPromptText(prompt.prompt_text);
  };

  const cancelEditingPrompt = () => {
    setEditingPrompt(null);
    setEditedPromptText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Editor de Defesa com IA
                </DialogTitle>
                <p className="text-sm text-gray-600">
                  Processo #{processo.id} • {processo.titulo || 'Sem título'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearChat}
                  className="text-gray-600 hover:text-red-600"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* Sidebar com sugestões editáveis */}
          <div className="w-80 border-r bg-gray-50 p-4 flex flex-col">
            <div className="mb-4 flex-1">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Sugestões de Prompts
              </h3>

              {loadingPrompts ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {sugestoes.map((sugestao) => (
                    <div key={sugestao.id} className="group">
                      {editingPrompt === sugestao.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editedPromptText}
                            onChange={(e) => setEditedPromptText(e.target.value)}
                            className="text-sm"
                            placeholder="Editar prompt..."
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => updatePrompt(sugestao.id)}
                              className="flex-1"
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingPrompt}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() => handlePromptClick(sugestao.prompt_text)}
                            className="w-full text-left p-3 rounded-lg bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-sm text-gray-700 hover:text-gray-900"
                          >
                            {sugestao.prompt_text}
                          </button>
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              onClick={() => startEditingPrompt(sugestao)}
                              className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 hover:text-blue-600"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deletePrompt(sugestao.id)}
                              className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Adicionar novo prompt */}
              <div className="space-y-2">
                <Input
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="Adicionar nova sugestão..."
                  className="text-sm"
                />
                <Button
                  onClick={addNewPrompt}
                  disabled={!newPrompt.trim()}
                  size="sm"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Prompt
                </Button>
              </div>
            </div>
          </div>

          {/* Área principal do chat */}
          <div className="flex-1 flex flex-col">
            {/* Área de mensagens */}
            <div className="flex-1 min-h-0">
              <ScrollArea ref={scrollAreaRef} className="h-full">
                <div className="p-6 space-y-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Comece a editar sua defesa
                      </h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        Use as sugestões ao lado ou digite suas instruções para a IA editar a defesa do processo.
                      </p>
                    </div>
                  ) : (
                    messages.map(message => (
                      <div key={message.id} className={`flex items-start gap-4 ${message.type === 'user' ? 'justify-end' : ''}`}>
                        {message.type === 'ai' && (
                          <Avatar className="h-10 w-10 border-2 border-blue-100">
                            <AvatarFallback className="bg-blue-500 text-white">
                              <Bot className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className={`flex-1 max-w-[75%] ${message.type === 'user' ? 'order-2' : ''}`}>
                          <div className={`flex items-center gap-2 mb-2 ${message.type === 'user' ? 'justify-end' : ''}`}>
                            <span className="text-sm font-medium text-gray-900">
                              {message.type === 'user' ? 'Você' : 'IA Trabalhista'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {message.timestamp.toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div className={`relative group ${message.type === 'user' ? 'ml-auto' : ''
                            }`}>
                            <div className={`p-4 rounded-2xl shadow-sm ${message.type === 'user'
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-white border border-gray-200 rounded-bl-md'
                              }`}>
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {formatText(message.content)}
                              </p>
                            </div>

                            {/* Botão de copiar */}
                            {message.type === 'ai' && (
                              <button
                                onClick={() => handleCopyMessage(message.content, message.id)}
                                className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3 text-gray-600" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {message.type === 'user' && (
                          <Avatar className="h-10 w-10 border-2 border-blue-100">
                            <AvatarFallback className="bg-gray-500 text-white">
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}

                  {loading && (
                    <div className="flex items-center gap-3 text-gray-600 px-4 py-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm font-medium">IA está processando sua solicitação...</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Área de input e ações */}
            <div className="border-t bg-white p-4 space-y-4">
              {/* Botão de registrar defesa */}
              {messages.some(m => m.type === 'ai') && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleRegisterDefense}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    size="lg"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando Defesa..." : "Salvar Defesa Atualizada"}
                  </Button>
                </div>
              )}

              {/* Campo de entrada + preview */}
              <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite suas instruções para editar a defesa... (Shift + Enter para nova linha)"
                      disabled={loading}
                      className="resize-none min-h-[48px] max-h-[120px] pr-12 rounded-xl border-gray-200 
             focus:border-blue-300 focus:ring-blue-200 px-3 py-2 leading-relaxed"
                      rows={1}
                    />
                    <div className="absolute right-3 bottom-1 text-xs text-gray-400">
                      Enter para enviar
                    </div>
                  </div>

                  {/* Botão de upload de arquivo */}
                  <label className="flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt,.html,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setSelectedFile(file);
                        console.log("Arquivo selecionado:", file);
                      }}
                    />
                    <Paperclip className="h-5 w-5 text-gray-600" />
                  </label>

                  <Button
                    type="submit"
                    disabled={loading || (!inputValue.trim() && !selectedFile)}
                    className="px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                    size="lg"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Preview do arquivo (embaixo do input) */}
                {selectedFile && (
                  <div className="flex items-center gap-2 p-2 text-sm text-gray-700">
                    {selectedFile.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="preview"
                        className="h-10 w-10 object-cover rounded-md"
                      />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}

                    {/* Nome do arquivo com espaço pro botão de excluir */}
                    <span className="truncate max-w-80">{selectedFile.name}</span>



                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-gray-600 hover:text-gray-800 font-bold"
                    >
                      X
                    </button>
                  </div>
                )}

              </form>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DefenseEditChat;
