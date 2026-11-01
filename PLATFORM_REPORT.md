# Relatório de Estado da Plataforma KONECTA

## O Que Já Existe ✅
1. **Identidade Visual Editorial & PWA**: Interface responsiva e PWA configurado com Workbox service worker customizado (`src/sw.ts`), suporte a Web Push e pré-cache automático.
2. **Autenticação Real Supabase**: Conexão direta ao projeto `rrczdshxyuamtomuswmv` com autenticação persistente e gestão de perfis (`profiles`).
3. **Módulo de Projetos e Candidaturas**: Candidaturas a projetos (`project_applications`) com prevenção de duplicados e atualização de estado gerida no servidor via triggers.
4. **Mensagens Privadas & Notificações Web Push**: Troca de mensagens em tempo real, notas de voz, anexos multimédia, presença em `user_presence` e subscrição de dispositivos em `push_devices`.
5. **Feed & Realtime Debounced**: Atualizações de feed com debounce de 1,5s para otimizar o consumo de dados e chamadas à API.
6. **Organizações & Módulos Sociais**: Módulos ativos para igrejas, partidos, movimentos cívicos, escritores, bibliotecas digitais, eventos e Reels.

## Configuração de Notificações Push
- As mensagens e notificações push utilizam a tabela `push_devices` e a Edge Function `send-push` com autenticação por chave de serviço ou secret de webhook.

## Próximos Passos Sugeridos
- Realizar deploy da Edge Function `send-push` no projeto `rrczdshxyuamtomuswmv`.
- Configurar variáveis de ambiente VAPID no Supabase.
