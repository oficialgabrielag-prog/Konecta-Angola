# KONECTA — INVENTÁRIO TÉCNICO COMPLETO DA BASE DE DADOS

**Projeto Supabase**: `rrczdshxyuamtomuswmv`  
**Endpoint**: `https://rrczdshxyuamtomuswmv.supabase.co`  
**Esquema Principal**: `public`  
**Status de RLS**: Ativo nas tabelas do sistema

---

## 1. Esquema Real de Tabelas Canónicas

| Tabela | Colunas Principais | Finalidade e Regras |
| :--- | :--- | :--- |
| **`profiles`** | `user_id (PK)`, `username`, `display_name`, `bio`, `avatar_url`, `cover_url`, `visibility`, `created_at`, `updated_at` | Perfis de utilizadores vinculados ao `auth.users.id`. Leitura pública; escrita restrita ao titular. |
| **`notifications`** | `id (PK)`, `user_id`, `actor_id`, `notification_type`, `title`, `body`, `target_type`, `target_id`, `read_at`, `created_at` | Alertas gerados pelo servidor. Leitura e marcação de leitura (`read_at`) pelo destinatário. Criação via triggers. |
| **`project_applications`** | `id (PK)`, `project_id`, `applicant_id`, `message`, `skills`, `status` (`pending`, `accepted`, `rejected`, `withdrawn`), `reviewed_by`, `reviewed_at`, `created_at`, `updated_at` | Candidaturas a projetos colaborativos. Processamento e triggers de membros e alertas no servidor. |
| **`push_devices`** | `id (PK)`, `user_id`, `device_token`, `platform`, `enabled`, `last_seen_at`, `created_at` | Dispositivos registados para Web Push. Upsert por `(user_id, device_token)`. |
| **`user_presence`** | `user_id (PK)`, `last_seen_at`, `updated_at` | Registo de batimento de presença online (atualizado a cada 3 minutos quando a aba está visível). |
| **`ideas`** | `id`, `title`, `description`, `category`, `author_id`, `created_at`, `updated_at` | Propostas de inovação e publicações no feed. |
| **`projects`** | `id`, `title`, `description`, `category`, `status`, `leader_id`, `created_at` | Projetos de campo ativos. |
| **`project_members`** | `id`, `project_id`, `user_id`, `joined_at` | Membros aceites na equipa de execução do projeto. |
| **`events`** | `id`, `title`, `description`, `starts_at`, `ends_at`, `organizer_id`, `venue`, `event_type`, `format` | Eventos e workshops. |
| **`event_attendees`** | `event_id`, `user_id`, `response`, `responded_at` | Registo de participantes e inscrições em eventos. |
| **`conversations`** | `id`, `created_at`, `updated_at` | Salas de mensagens privadas em tempo real. |
| **`conversation_members`** | `conversation_id`, `user_id`, `joined_at`, `last_read_at` | Membros e marcas de leitura de cada conversa. |
| **`messages`** | `id`, `conversation_id`, `sender_id`, `body`, `media_url`, `created_at` | Troca de mensagens entre utilizadores. |
| **`reels`** | `id`, `author_id`, `video_url`, `caption`, `created_at` | Conteúdo de vídeo em formato vertical. |
| **`organizations`** | `id`, `name`, `slug`, `category`, `owner_id`, `verified` | Perfis e páginas de organizações e instituições. |
