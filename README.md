# 🪐 Órbita

Aplicativo mobile **free algorithms**: o usuário monta a própria timeline a partir de seus interesses e recebe notícias e vídeos reais sobre eles, em **ordem cronológica estrita**, sem recomendação oculta.

Desenvolvido com **React Native + Expo** (expo-router), compatível com Android e iOS.

---

## Como funciona

1. No primeiro acesso, o usuário escolhe **pelo menos 1** interesse (chips padrão ou palavra-chave digitada, até 10).
2. A aba **Notícias** busca matérias de cada interesse via **RSS de busca do Google Notícias** (gratuito, sem chave de API).
3. A aba **Vídeos** busca vídeos do YouTube dos mesmos interesses, por meio de um **proxy** próprio (veja [Proxy de Vídeos](#proxy-de-vídeos)).
4. Tudo é unido, deduplicado e ordenado da **mais recente para a mais antiga**.
5. Interesses, favoritos e tema ficam salvos no aparelho (AsyncStorage). Ao reabrir, o app vai direto para o feed.

---

## Telas

| Tela            | Arquivo                        | O que faz                                                                                                                  |
| --------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Onboarding      | `src/app/index.tsx`            | Escolha dos interesses iniciais (padrão + palavra-chave livre). Quem já tem interesses salvos é redirecionado para o feed. |
| Notícias (feed) | `src/app/(tabs)/index.tsx`     | Timeline de notícias, filtro por interesse, gerenciamento de interesses e pull-to-refresh.                                 |
| Vídeos          | `src/app/(tabs)/videos.tsx`    | Vídeos do YouTube dos seus interesses, com filtro por interesse e pull-to-refresh.                                         |
| Favoritos       | `src/app/(tabs)/favorites.tsx` | Notícias **e** vídeos salvos com a estrela.                                                                                |

---

## Funcionalidades implementadas

- **Onboarding** com interesses padrão e palavras-chave livres
- **Timeline funcional** com notícias reais via RSS
- **Vídeos reais** do YouTube via proxy
- **Filtro por interesse** (ícone de funil) nas abas Notícias e Vídeos
- **Gerenciamento de interesses** (adicionar/remover) pelo ícone de opções
- **Pull-to-refresh** para atualizar o conteúdo
- **Favoritos** (estrela no card) para notícias e vídeos, com aba própria
- **Abertura do conteúdo** no navegador interno (`expo-web-browser`), apenas para links `http(s)`
- **Tema claro/escuro** com ícone sol/lua, paleta arroxeada no escuro e logo específica para cada tema
- **Persistência local** de interesses, favoritos e tema

### Requisitos do escopo

| Requisito                                          | Status                                                      |
| -------------------------------------------------- | ----------------------------------------------------------- |
| RF01 – Cadastro de interesse inicial               | ✅                                                          |
| RF02 – Gerenciamento de interesses                 | ✅                                                          |
| RF03 – Timeline apenas dos interesses selecionados | ✅                                                          |
| RF04 – Filtro da timeline                          | ✅                                                          |
| RNF01 – React Native + Expo                        | ✅                                                          |
| RNF02 – Interface minimalista                      | ✅                                                          |
| RNF03 – Carregamento em até 8s                     | ✅                                                          |
| RNF04 – Armazenamento local                        | ✅                                                          |
| RN01 – Mínimo de 1 interesse                       | ✅                                                          |
| RN02 – Ordenação cronológica estrita               | ✅                                                          |
| RN03 – Sem refresh em segundo plano                | ✅ Atualiza ao abrir, ao mudar interesses e ao puxar a tela |
| RN04 – Limite de 10 interesses                     | ✅                                                          |
| RN05 – Persistência com AsyncStorage               | ✅                                                          |

---

## Estrutura do projeto

```
Orbita/
├── src/
│   ├── app/
│   │   ├── _layout.tsx          # Layout raiz: AppProvider, StatusBar e tema
│   │   ├── index.tsx            # Tela de Onboarding
│   │   └── (tabs)/
│   │       ├── _layout.tsx      # Abas (Notícias, Vídeos, Favoritos), logo e ícone de tema
│   │       ├── index.tsx        # Timeline de notícias (filtro, gerenciar interesses)
│   │       ├── videos.tsx       # Timeline de vídeos (YouTube via proxy)
│   │       └── favorites.tsx    # Favoritos (notícias e vídeos)
│   ├── components/
│   │   ├── news-card.tsx        # Card de notícia (feed e favoritos)
│   │   ├── video-card.tsx       # Card de vídeo + conversão para favorito
│   │   └── theme-toggle.tsx     # Ícone sol/lua
│   ├── context/
│   │   └── AppContext.tsx       # Interesses, favoritos e tema + AsyncStorage
│   ├── services/
│   │   ├── newsService.ts       # Busca RSS por interesse, junta, deduplica e ordena
│   │   ├── rssParser.ts         # Parser de XML leve, sem dependências
│   │   ├── videoService.ts      # Busca de vídeos por interesse (via proxy)
│   │   ├── apiConfig.ts         # Descobre a URL do proxy, timeout e tratamento de erros
│   │   └── contentService.ts    # Tipos de conteúdo e ordenação cronológica (sortChronologically)
│   ├── constants/theme.ts       # Paletas clara e escura
│   ├── types/                   # content.ts (vídeos) e news.ts (notícias e favoritos)
│   ├── utils/
│   │   ├── safe-url.ts          # Valida http(s) e abre links no navegador interno
│   │   └── time.ts              # "Há 2 horas", "Ontem"...
│   └── arquivo/
│       └── social.tsx.bak       # Antiga aba Social (arquivada, fora do app)
├── proxy-server/                # Proxy hospedado (Render), sem dependências
│   ├── server.cjs
│   ├── render.yaml
│   └── README.md
├── scripts/
│   ├── social-api-proxy.cjs     # Proxy para rodar localmente (npm run social-api)
│   └── test-proxy.cjs           # Testes do proxy com SerpApi falsa
├── assets/                      # Logos (claro/escuro), ícones e splash
├── app.json                     # Configuração do Expo
└── eas.json                     # Perfis de build (EAS)
```

> Alguns arquivos de `src/components/` e `src/hooks/` (`themed-text`, `themed-view`, `external-link`, `hint-row`, `web-badge`, `ui/collapsible`, `use-theme`, etc.) vieram do template do Expo e não fazem parte do fluxo principal do app.

### Fonte de notícias

`newsService.ts` monta uma URL do Google Notícias para cada interesse:

```
https://news.google.com/rss/search?q=<termo> when:7d&hl=pt-BR&gl=BR&ceid=BR:pt-419
```

Os interesses padrão têm um termo de busca mais preciso (mapa `QUERY_BY_INTEREST`). Qualquer palavra-chave digitada é buscada como está. São até 15 notícias por interesse, da última semana, com timeout de 8s por busca.

### Persistência local

Chaves usadas no AsyncStorage (`AppContext.tsx`):

| Chave               | Conteúdo                                                           |
| ------------------- | ------------------------------------------------------------------ |
| `@orbita/interests` | Lista de interesses (máx. 10)                                      |
| `@orbita/favorites` | Notícias e vídeos favoritados                                      |
| `@orbita/theme`     | Tema escolhido (`light` / `dark`); sem escolha, segue o do sistema |

---

## Como rodar

```bash
npm install
npx expo start
```

Abra no **Expo Go** (celular) ou em um emulador Android/iOS.

> ⚠️ Teste em dispositivo ou emulador, **não no navegador**. No web, o Google Notícias bloqueia as requisições por CORS.

Scripts disponíveis:

| Comando                           | O que faz                                                |
| --------------------------------- | -------------------------------------------------------- |
| `npm start`                       | Inicia o Expo                                            |
| `npm run android` / `npm run ios` | Inicia já abrindo no emulador                            |
| `npm run lint`                    | Roda o lint do Expo                                      |
| `npm run social-api`              | Sobe o proxy local na porta 3002                         |
| `npm run test:proxy`              | Testa o proxy com uma SerpApi falsa (não gasta créditos) |

A aba **Notícias** funciona só com o passo acima. A aba **Vídeos** precisa do proxy (próxima seção).

---

## Proxy de Vídeos

A aba **Vídeos** usa o YouTube via **SerpApi** (engine `youtube`). Como a chave da SerpApi não pode ficar dentro do app, ela fica em um proxy que o app chama.

| Rota                         | Uso                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /health`                | Verifica se o proxy está no ar e se a `SERPAPI_KEY` está configurada                       |
| `GET /video-search?q=termo`  | Vídeos do YouTube (usada pelo app)                                                         |
| `GET /social-search?q=termo` | Resultados de redes sociais (**não é mais usada pelo app**, desde a remoção da aba Social) |

Existem duas cópias do proxy, com a mesma lógica:

|                       | `scripts/social-api-proxy.cjs` | `proxy-server/server.cjs`                                         |
| --------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Uso                   | Desenvolvimento local          | Hospedagem (Render)                                               |
| Chave lida de         | `.env` na raiz do projeto      | Variável de ambiente `SERPAPI_KEY` (ou `.env` em `proxy-server/`) |
| Limite de requisições | 30/min por IP                  | 60/min por IP (configurável com `RATE_LIMIT_MAX`)                 |
| IP do cliente         | Conexão direta                 | Considera `X-Forwarded-For` (atrás do Render)                     |

### Rodando localmente

Crie um arquivo `.env` na raiz do projeto:

```
SERPAPI_KEY=sua_chave_aqui
```

Em **dois terminais**:

```bash
npm run social-api          # proxy na porta 3002
npx expo start              # app
```

Como o app descobre o proxy (`src/services/apiConfig.ts`):

1. Se `EXPO_PUBLIC_SOCIAL_API_URL` estiver definida, usa essa URL.
2. Senão, usa o IP do computador que serve o app no Expo Go (celular e computador na **mesma rede Wi-Fi**).
3. Senão, usa `10.0.2.2` no emulador Android e `localhost` no iOS.

Com o **túnel do Expo (`--tunnel`)** o app não consegue achar o proxy sozinho: defina `EXPO_PUBLIC_SOCIAL_API_URL=http://IP-DO-PC:3002` no `.env`.

> **Cota da SerpApi:** cada interesse gasta 1 busca em Vídeos a cada atualização. O proxy guarda o resultado por 2 minutos para não gastar à toa.

### Hospedagem (Render)

O arquivo `proxy-server/render.yaml` já descreve o serviço: raiz `proxy-server`, sem build, start com `node server.cjs` e health check em `/health`.

1. Crie o serviço no Render apontando para este repositório.
2. Configure a variável `SERPAPI_KEY` no painel (ela não vai no `render.yaml`).
3. Teste: `GET /health` deve responder `{"ok":true,"serpapi":true}`.

No plano gratuito do Render o serviço pode "dormir" quando fica parado, então a primeira busca de Vídeos depois de um tempo sem uso pode demorar mais.

---

## Build do app (EAS)

O `eas.json` tem dois perfis:

| Perfil       | Saída                       | Observação                                                                                         |
| ------------ | --------------------------- | -------------------------------------------------------------------------------------------------- |
| `preview`    | APK (distribuição interna)  | Já embute `EXPO_PUBLIC_SOCIAL_API_URL` apontando para o proxy hospedado no Render                  |
| `production` | Android App Bundle (`.aab`) | Não define a URL do proxy: configure antes de publicar, senão a aba Vídeos não encontra o servidor |

```bash
eas build --profile preview --platform android
```

Pacote Android: `com.orbita.app`.

---

## Segurança

- **Nenhuma chave dentro do app.** O bundle de um app pode ser extraído por qualquer pessoa; chaves ficam só no proxy. Variáveis `EXPO_PUBLIC_*` ficam visíveis no app: nunca coloque chaves nelas (a URL do proxy pode, a chave não).
- Arquivos `.env` estão no `.gitignore` (só um `.env.example`, sem valores, poderia ser versionado).
- O proxy valida e limita o termo buscado (2 a 80 caracteres), aceita só links `http(s)` de domínios esperados, aplica limite de requisições por IP, faz cache curto, não repassa detalhes de erros da SerpApi e só libera CORS para `localhost`.
- O app só abre links `http(s)` (`src/utils/safe-url.ts`), bloqueando `javascript:`, `file:` etc.
- `SOCIAL_API_HOST=127.0.0.1` fecha o proxy local para o resto da rede, se você estiver só no emulador.

---

## Versões

O projeto está no **Expo SDK 58** (`expo ^58`, React Native 0.88, React 19.3, expo-router ~58). O SDK 58 exige um Expo Go compatível: se o seu Expo Go da loja ainda estiver em uma versão anterior, use um _development build_ ou aguarde a atualização da loja.

---

## Limitações conhecidas

- Os cards de **notícia não têm imagem** (o RSS do Google Notícias não envia). Os cards de vídeo têm miniatura.
- A aba **Vídeos** depende do proxy e da `SERPAPI_KEY`; sem eles, mostra uma mensagem de erro com botão "Tentar novamente".
- A **aba Social foi removida** do app. O código antigo está arquivado em `src/arquivo/social.tsx.bak`.
- Não há **tela de configurações** nem coleta de **nome e idade** do usuário.

## Próximos passos

- [ ] Tela de configurações (nome, idade, tema)
- [ ] Imagens nos cards de notícia usando feeds de portais com `<enclosure>`
- [ ] Leitura de feeds RSS de portais e blogs escolhidos pelo usuário (previsto no escopo)
- [ ] Layout mais próximo do estilo Twitter/X (RNF02)
- [ ] Medir e otimizar o tempo de carregamento (RNF03)
- [ ] Remover do `package.json` as dependências do template que o app não usa
