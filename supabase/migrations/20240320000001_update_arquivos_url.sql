-- Primeiro, remover a coluna antiga se existir
ALTER TABLE processos DROP COLUMN IF EXISTS arquivo_url;

-- Adicionar a nova coluna como array de texto
ALTER TABLE processos ADD COLUMN arquivos_url TEXT[] DEFAULT '{}'; 