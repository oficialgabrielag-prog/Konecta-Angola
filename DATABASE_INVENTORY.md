# KONECTA — INVENTÁRIO TÉCNICO COMPLETO DA BASE DE DADOS

**Projeto Supabase**: `gzipmbloqalmkgvugnrk`  
**Endpoint**: `https://gzipmbloqalmkgvugnrk.supabase.co`  
**Esquema Principal**: `public`  
**Status de RLS**: Ativo em todas as tabelas

---

## 1. Tabelas Principais Originais (A)

| Tabela | Colunas e Tipos | Chave Primária (PK) | Chaves Estrangeiras (FK) | Políticas RLS | Funcionalidade na Aplicação | Status de Integração |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`profiles`** | `id (uuid)`, `full_name (text)`, `avatar_url (text)`, `bio (text)`, `province (text)`, `municipality (text)`, `interests (text[])`, `created_at (timestamptz)`, `updated_at (timestamptz)` | `id` | `id -> auth.users.id` | Leitura pública; Escrita/Atualização apenas pelo próprio titular (`auth.uid() = id`) | Perfil de utilizador, cartões de autor, dados de localização e identificação | **Totalmente Integrado** |
| **`ideas`** | `id (uuid)`, `title (text)`, `description (text)`, `category (text)`, `province (text)`, `image_url (text)`, `user_id (uuid)`, `votes_count (int)`, `created_at (timestamptz)`, `updated_at (timestamptz)` | `id` | `user_id -> profiles.id` | Leitura pública; Criação/Edição/Eliminação apenas pelo autor (`auth.uid() = user_id`) | Feed principal de inovação, explorar ideias, detalhe da iniciativa, votação | **Totalmente Integrado** |
| **`challenges`** | `id (uuid)`, `title (text)`, `description (text)`, `category (text)`, `goal (text)`, `deadline (timestamptz)`, `reward (text)`, `status (text)`, `user_id (uuid)`, `participants_count (int)`, `created_at (timestamptz)` | `id` | `user_id -> profiles.id` | Leitura pública; Participação/Gestão autorizada | Lista e detalhes de desafios nacionais de inovação comunitária | **Totalmente Integrado** |
| **`challenge_participants`** | `id (uuid)`, `challenge_id (uuid)`, `user_id (uuid)`, `joined_at (timestamptz)` | `id` | `challenge_id -> challenges.id`, `user_id -> profiles.id` | Leitura pública; Inscrição autenticada (`auth.uid() = user_id`) | Inscrição e acompanhamento de inovadores nos desafios | **Totalmente Integrado** |
| **`challenge_votes`** | `id (uuid)`, `challenge_id (uuid)`, `user_id (uuid)`, `created_at (timestamptz)` | `id` | `challenge_id -> challenges.id`, `user_id -> profiles.id` | Leitura pública; 1 voto por utilizador autenticado | Votação e ranking comunitário de soluções nos desafios | **Totalmente Integrado** |
| **`projects`** | `id (uuid)`, `title (text)`, `description (text)`, `status (text)`, `category (text)`, `province (text)`, `image_url (text)`, `leader_id (uuid)`, `created_at (timestamptz)` | `id` | `leader_id -> profiles.id` | Leitura pública; Gestão pelo líder do projeto | Acompanhamento de projetos de campo e iniciativas ativas | **Totalmente Integrado** |
| **`project_members`** | `id (uuid)`, `project_id (uuid)`, `user_id (uuid)`, `role (text)`, `joined_at (timestamptz)` | `id` | `project_id -> projects.id`, `user_id -> profiles.id` | Leitura pública; Adesão pelo próprio utilizador | Gestão da equipa de execução e colaboradores do projeto | **Totalmente Integrado** |
| **`milestones`** | `id (uuid)`, `project_id (uuid)`, `title (text)`, `description (text)`, `due_date (timestamptz)`, `status (text)`, `created_at (timestamptz)` | `id` | `project_id -> projects.id` | Leitura pública; Criação/Edição por membros do projeto | Marcos cronológicos e fases de entrega do projeto | **Totalmente Integrado** |
| **`tasks`** | `id (uuid)`, `project_id (uuid)`, `milestone_id (uuid)`, `title (text)`, `status (text: todo/in_progress/done)`, `assignee_id (uuid)`, `created_at (timestamptz)` | `id` | `project_id -> projects.id`, `assignee_id -> profiles.id` | Leitura pública; Criação pelo líder; Alternância por membros | Plano de ação operacional, tarefas pendentes e concluídas | **Totalmente Integrado** |
| **`discussions`** | `id (uuid)`, `idea_id (uuid)`, `project_id (uuid)`, `title (text)`, `content (text)`, `user_id (uuid)`, `created_at (timestamptz)` | `id` | `idea_id -> ideas.id`, `project_id -> projects.id`, `user_id -> profiles.id` | Leitura pública; Criação por utilizadores autenticados | Fóruns e tópicos temáticos associados a ideias ou projetos | **Totalmente Integrado** |
| **`comments`** | `id (uuid)`, `post_id (uuid)`, `idea_id (uuid)`, `discussion_id (uuid)`, `content (text)`, `user_id (uuid)`, `created_at (timestamptz)` | `id` | `idea_id -> ideas.id`, `post_id -> posts.id`, `user_id -> profiles.id` | Leitura pública; Criação/Eliminação pelo autor | Comentários reais nas publicações, ideias e discussões | **Totalmente Integrado** |
| **`notifications`** | `id (uuid)`, `user_id (uuid)`, `title (text)`, `message (text)`, `read (boolean)`, `type (text)`, `created_at (timestamptz)` | `id` | `user_id -> profiles.id` | Consulta e atualização apenas pelo destinatário (`auth.uid() = user_id`) | Central de notificações de votos, respostas e marcos | **Totalmente Integrado** |
| **`reports`** | `id (uuid)`, `reporter_id (uuid)`, `target_type (text)`, `target_id (uuid)`, `reason (text)`, `status (text)`, `created_at (timestamptz)` | `id` | `reporter_id -> profiles.id` | Criação autenticada; Consulta restrita a administradores | Moderação e denúncia de conteúdo abusivo ou fraudulento | **Totalmente Integrado** |
| **`follows`** | `id (uuid)`, `follower_id (uuid)`, `following_id (uuid)`, `created_at (timestamptz)` | `id` | `follower_id -> profiles.id`, `following_id -> profiles.id` | Leitura pública; Inserção/Eliminação pelo seguidor (`auth.uid() = follower_id`) | Rede de conexões e seguimento mútuo entre inovadores | **Totalmente Integrado** |

---

## 2. Tabelas Sociais, Mensagens e Comunidade (B)

| Tabela | Colunas e Tipos | Chave Primária (PK) | Chaves Estrangeiras (FK) | Políticas RLS | Funcionalidade na Aplicação | Status de Integração |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`posts`** | `id (uuid)`, `content (text)`, `image_url (text)`, `user_id (uuid)`, `likes_count (int)`, `comments_count (int)`, `created_at (timestamptz)` | `id` | `user_id -> profiles.id` | Leitura pública; Criação e eliminação pelo autor | Feed da comunidade e feed pessoal do perfil | **Totalmente Integrado** |
| **`post_likes`** | `id (uuid)`, `post_id (uuid)`, `user_id (uuid)`, `created_at (timestamptz)` | `id` | `post_id -> posts.id`, `user_id -> profiles.id` | Leitura pública; Criação/Eliminação pelo titular (`auth.uid() = user_id`) | Gestão de gostos em publicações (prevenção de duplicados) | **Totalmente Integrado** |
| **`post_bookmarks`** | `id (uuid)`, `post_id (uuid)`, `user_id (uuid)`, `created_at (timestamptz)` | `id` | `post_id -> posts.id`, `user_id -> profiles.id` | Consulta e escrita apenas pelo titular (`auth.uid() = user_id`) | Guardar publicações nos favoritos pessoais | **Totalmente Integrado** |
| **`conversations`** | `id (uuid)`, `last_message (text)`, `last_message_at (timestamptz)`, `created_at (timestamptz)` | `id` | N/A | Consulta apenas para membros associados na conversa | Lista de salas e diálogos diretos de mensagens privadas | **Totalmente Integrado** |
| **`conversation_members`** | `id (uuid)`, `conversation_id (uuid)`, `user_id (uuid)`, `joined_at (timestamptz)` | `id` | `conversation_id -> conversations.id`, `user_id -> profiles.id` | Leitura e escrita apenas para os respetivos membros | Participantes autorizados em cada diálogo privado | **Totalmente Integrado** |
| **`messages`** | `id (uuid)`, `conversation_id (uuid)`, `sender_id (uuid)`, `content (text)`, `created_at (timestamptz)` | `id` | `conversation_id -> conversations.id`, `sender_id -> profiles.id` | Leitura restrita aos membros da conversa; Criação pelo remetente | Troca de mensagens em tempo real entre membros | **Totalmente Integrado** |
| **`communities`** | `id (uuid)`, `name (text)`, `description (text)`, `image_url (text)`, `member_count (int)`, `created_at (timestamptz)` | `id` | N/A | Leitura pública; Criação por membros autorizados | Hub de grupos temáticos por província ou setor | **Totalmente Integrado** |
| **`community_members`** | `id (uuid)`, `community_id (uuid)`, `user_id (uuid)`, `joined_at (timestamptz)` | `id` | `community_id -> communities.id`, `user_id -> profiles.id` | Leitura pública; Entrada/Saída pelo utilizador autenticado | Registo de membros que pertencem a cada comunidade | **Totalmente Integrado** |
| **`community_posts`** | `id (uuid)`, `community_id (uuid)`, `post_id (uuid)`, `created_at (timestamptz)` | `id` | `community_id -> communities.id`, `post_id -> posts.id` | Leitura pública; Criação pelos membros da comunidade | Vínculo entre publicações e as respetivas comunidades | **Totalmente Integrado** |
| **`events`** | `id (uuid)`, `title (text)`, `description (text)`, `date (timestamptz)`, `location (text)`, `image_url (text)`, `organizer_id (uuid)`, `participant_count (int)`, `created_at (timestamptz)` | `id` | `organizer_id -> profiles.id` | Leitura pública; Gestão pelo organizador | Agenda de conferências, workshops e encontros locais | **Totalmente Integrado** |
| **`event_participants`** | `id (uuid)`, `event_id (uuid)`, `user_id (uuid)`, `registered_at (timestamptz)` | `id` | `event_id -> events.id`, `user_id -> profiles.id` | Leitura pública; Inscrição e cancelamento pelo titular | Inscrições reais de inovadores nos eventos | **Totalmente Integrado** |

---

## 3. Tabelas de Expansão Física (`konecta_ext_####`) (C)

* **Padrão de Nome**: `konecta_ext_0001` até `konecta_ext_10000` (10.000 partições físicas confirmadas).
* **Finalidade no Banco**: Camada de particionamento e auditoria de metadados transacionais.
* **Diretriz de Utilização**: Não substituir as tabelas centrais de negócio (`posts`, `profiles`, `ideas`, `messages`) por tabelas de expansão genéricas. O frontend interage diretamente com o esquema canónico estruturado.

---

## 4. Matriz de Cobertura das Telas na Aplicação

1. **Tela 1 — Início e Feed**: `posts`, `ideas`, `profiles`, `comments`, `post_likes`
2. **Tela 2 — Explorar Ideias**: `ideas`, `profiles`, `comments`, `discussions`
3. **Tela 3 — Desafios**: `challenges`, `challenge_participants`, `challenge_votes`, `profiles`
4. **Tela 4 — Projetos Colaborativos**: `projects`, `project_members`, `milestones`, `tasks`, `profiles`
5. **Tela 5 — Discussões e Comentários**: `discussions`, `comments`, `profiles`
6. **Tela 6 — Gostos e Favoritos**: `post_likes`, `post_bookmarks`, `posts`
7. **Tela 7 — Mensagens Privadas**: `conversations`, `conversation_members`, `messages`, `profiles`
8. **Tela 8 — Comunidades**: `communities`, `community_members`, `community_posts`, `posts`
9. **Tela 9 — Eventos**: `events`, `event_participants`, `profiles`
10. **Tela 10 — Notificações**: `notifications`, `profiles`
11. **Tela 11 — Perfil de Utilizador**: `profiles`, `posts`, `ideas`, `projects`, `project_members`, `follows`
12. **Tela 12 — Seguidores e Ligações**: `follows`, `profiles`
13. **Tela 13 — Pesquisa Global**: `ideas`, `profiles`, `projects`, `posts`, `communities`, `events`
14. **Tela 14 — Painel Pessoal**: `ideas`, `posts`, `projects`, `challenge_participants`, `events`
15. **Tela 15 — Centro de Atividade e Relatórios**: `reports`, `profiles`
