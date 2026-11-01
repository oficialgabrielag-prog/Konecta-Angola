# Plano de Implementação: Sistema de Reels - KONECTA Angola

## Objetivo
Integrar uma experiência completa de Reels no KONECTA Angola utilizando a infraestrutura existente (Supabase + Cloudinary).

## Visão Geral da Arquitetura
1.  **Modelo de Dados**: Utilizar as tabelas `reels`, `reel_reactions`, `reel_comments` já existentes.
2.  **Visualizador**: Novo componente `ReelViewer` para reprodução em ecrã inteiro.
3.  **Integração**:
    *   **Feed Principal**: Inserir `ReelCard` entre posts normais.
    *   **Explorar**: Criar secção de Reels com grelha 9:16.
4.  **Sincronização**: Realtime do Supabase para atualizar gostos, comentários e visualizações.

## Etapas do Desenvolvimento
1.  **Análise e Preparação**:
    *   Verificar schema `reels` no Supabase via `d1Client.ts` (já feito).
    *   Confirmar políticas RLS.
2.  **Componentes**:
    *   `ReelViewer`: Componente de ecrã inteiro com navegação vertical, suporte a interações (gostar, comentar, partilhar) e carregamento inteligente (próximo vídeo).
    *   `ReelCard`: Versão compacta para o Feed e Explorar.
3.  **Integração de Interface**:
    *   Atualizar `Home.tsx` para mapear `posts` e `reels` num feed único (mixando os dois tipos).
    *   Adicionar secção de "Reels" na página `Explore.tsx`.
4.  **Interações**:
    *   Implementar chamadas da `d1Client.reels` para likes/comentários.
5.  **Testes**:
    *   Publicação, reprodução, navegação vertical, persistência de dados.

## Restrições
*   Não recriar tabelas.
*   Preservar RLS.
*   Performance (pre-loading de vídeos).
*   Mobile-first (compatibilidade total Android).
