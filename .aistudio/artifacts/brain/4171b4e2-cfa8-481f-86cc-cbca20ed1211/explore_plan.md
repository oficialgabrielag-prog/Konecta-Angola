# Plano de Implementação: Evolução da Página Explorar - KONECTA Angola

## Objetivo
Transformar a página `Explore.tsx` numa central profissional de descoberta, permitindo a pesquisa e filtragem de conteúdos, utilizadores, comunidades, empresas e tendências.

## Visão Geral da Arquitetura
1.  **Frontend**: Atualização da página `Explore.tsx` com estado para gestão de filtros e resultados.
2.  **Backend**: Aproveitamento do `d1Client.ts` para realizar consultas complexas ao Supabase com filtros por tipo de conteúdo.
3.  **UI/UX**: Design responsivo (grid 3 colunas em telemóvel), navegação intuitiva e estados de carregamento.

## Etapas do Desenvolvimento

### 1. Pesquisa Global e Filtros
*   Implementar barra de pesquisa persistente no `Explore.tsx`.
*   Criar sistema de separadores/filtros: *Descobrir, Reels, Pessoas, Comunidades, Publicações, Empresas*.
*   Atualizar lógica de fetching no `d1Client.ts` para suportar pesquisa baseada em texto e categoria.

### 2. Secções de Conteúdo (Componentes)
*   **Pessoas Recomendadas**: Nova secção com cartões de perfil e botões funcionais de seguir/deixar de seguir.
*   **Grelha de Reels**: Integração visual de miniaturas 9:16 apontando para o visualizador de ecrã inteiro.
*   **Comunidades**: Listagem com imagens de capa, membros e botão de participação.
*   **Feed de Publicações**: Reutilização do `PostCard` para mostrar posts públicos.
*   **Empresas**: Nova secção de empresas (exige verificação de tabela `companies` ou equivalente).

### 3. Algoritmo de Descoberta (Lógica)
*   Implementar query no Supabase que priorize interações recentes e relevância por categoria.
*   Adicionar lógica para filtrar utilizadores já seguidos.

### 4. Testes e Garantias
*   Verificar comportamento de RLS em todas as consultas.
*   Testar carregamento progressivo e estados de vazio (0 resultados).
*   Garantir a navegação profissional em Android (toque, deslize).

## Restrições
*   Não criar rotas adicionais.
*   Utilizar apenas Supabase e Cloudinary.
*   Seguir estritamente a identidade visual KONECTA (Navy/Gold).
