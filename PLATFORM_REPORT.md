# Relatório de Estado da Plataforma KONECTA

## O Que Já Existe ✅
1. **Identidade Visual Editorial**: Sistema visual inspirado na "Google Design Library" (2020-2026), com foco em tipografia Inter, layouts de artigo editorial e estética minimalista em branco e azul suave.
2. **PWA (Progressive Web App)**: Totalmente configurado com suporte offline, ícones adaptativos e manifest para instalação como aplicação nativa.
3. **Autenticação de Utilizadores**: Fluxos de Login e Registo integrados com Supabase (e fallback inteligente para modo de demonstração local).
4. **Social Feed & Ideias**: Capacidade de criar, visualizar e apoiar (votar) em iniciativas comunitárias por província e categoria.
5. **Perfil Dinâmico**: Gestão de perfil com upload de avatar (Cloudinary) e sincronização de dados em tempo real em todas as publicações.
6. **Desafios e Projetos**: Estrutura para participação em desafios nacionais e gestão de tarefas em projetos ativos.
7. **Integração Cloudinary**: Utilitário de upload para armazenamento persistente de imagens na nuvem.

## O Que Falta / Pontos de Melhoria 🛠️
1. **Configuração Supabase Real**: Atualmente a app usa "mock keys". Para persistência global (em diferentes dispositivos), é necessário configurar um projeto Supabase real e atualizar as variáveis de ambiente.
2. **Resiliência da Cloudinary**: Implementada sincronização com localStorage para garantir que imagens não "desapareçam" em modo demo, mas recomenda-se configurar o preset da Cloudinary como 'Unsigned' para produção.
3. **Notificações em Tempo Real**: Expandir as notificações para alertas push reais fora da aplicação.
4. **Modo Galeria Expandido**: Melhorar a experiência de seleção de múltiplas fotos para publicações de "storytelling" visual.

## Próximos Passos Sugeridos
- Validar as chaves de API da Cloudinary na consola.
- Conectar a uma base de dados Supabase ativa para remover a dependência do localStorage.
- Implementar filtros avançados por Município dentro das Províncias.
