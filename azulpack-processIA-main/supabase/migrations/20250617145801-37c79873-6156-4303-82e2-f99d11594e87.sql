
-- Atualizar o campo arquivos_url para ser um array de texto
ALTER TABLE public.processos 
ALTER COLUMN arquivos_url TYPE TEXT[] USING 
  CASE 
    WHEN arquivos_url IS NULL THEN '{}'::TEXT[]
    WHEN arquivos_url = '' THEN '{}'::TEXT[]
    ELSE string_to_array(arquivos_url, ',')
  END;

-- Definir valor padrão como array vazio
ALTER TABLE public.processos 
ALTER COLUMN arquivos_url SET DEFAULT '{}';
