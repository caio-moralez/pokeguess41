# PokeGuess

PokeGuess é um jogo web full stack onde usuários autenticados precisam adivinhar o nome correto de um Pokémon com base em sua imagem.
O projeto utiliza autenticação com AWS Cognito, cache e filas com Redis, integração com a PokeAPI e persistência de dados em banco relacional.

A aplicação está em produção e pode ser acessada em:
[https://pokeguess41.onrender.com/](https://pokeguess41.onrender.com/)

---

## Visão Geral

O fluxo principal do jogo funciona da seguinte forma:

1. O usuário cria uma conta ou faz login
2. O backend autentica o usuário via AWS Cognito
3. O servidor mantém uma fila de Pokémons no Redis
4. Um Pokémon é enviado ao usuário por rodada
5. O usuário tenta adivinhar o nome correto
6. A pontuação é atualizada no banco de dados
7. O ranking global pode ser consultado

---

## Tecnologias Utilizadas

### Backend

* Node.js
* Express
* AWS Cognito (autenticação e gerenciamento de usuários)
* Redis (cache, filas e estado do jogo)
* PostgreSQL
* Helmet (segurança)
* Express Validator (validação de dados)
* Dotenv (variáveis de ambiente)

### Frontend

* React
* Fetch API
* Build servido pelo próprio backend em produção

### Infraestrutura

* Render (deploy)
* AWS Cognito User Pool
* Redis externo

---

## Arquitetura do Projeto

```
client/              # Frontend React
server/
 ├─ authMiddleware   # Middleware de autenticação JWT (Cognito)
 ├─ redisClient      # Cliente Redis
 ├─ queries          # Queries do banco de dados
 ├─ server.js        # Servidor Express principal
 └─ .env
```

---

## Autenticação

A autenticação é feita utilizando AWS Cognito com o fluxo:

* USER_PASSWORD_AUTH

Tokens retornados:

* Access Token
* ID Token
* Refresh Token

O frontend envia o Access Token no header:

```
Authorization: Bearer <token>
```

O middleware `requireAuth` valida o token em todas as rotas protegidas.

---

## Rotas da API

### Autenticação

| Método | Rota               | Descrição         |
| ------ | ------------------ | ----------------- |
| POST   | /api/auth/register | Criação de conta  |
| POST   | /api/auth/login    | Login do usuário  |
| POST   | /api/auth/logout   | Logout global     |
| POST   | /api/auth/delete   | Exclusão da conta |

---

### Usuário

| Método | Rota           | Descrição                    |
| ------ | -------------- | ---------------------------- |
| GET    | /api/dashboard | Dados do usuário autenticado |

---

### Ranking

| Método | Rota             | Descrição      |
| ------ | ---------------- | -------------- |
| GET    | /api/leaderboard | Ranking global |

---

### Jogo

| Método | Rota                   | Descrição                 |
| ------ | ---------------------- | ------------------------- |
| GET    | /api/game/next-pokemon | Retorna o próximo Pokémon |
| POST   | /api/game/start        | Inicia uma rodada         |
| POST   | /api/game/guess        | Envia o palpite           |

---

## Sistema de Fila com Redis

O servidor mantém uma fila de Pokémons no Redis:

* Chave: `pokemonQueue`
* Tamanho máximo: 10 itens

Funcionamento:

* A fila é preenchida automaticamente ao iniciar o servidor
* Sempre que um Pokémon é consumido, outro é inserido em background
* Reduz chamadas à PokeAPI e melhora a performance

Cada Pokémon armazenado ocupa aproximadamente 250 a 300 bytes de memória no Redis.

---

## Pontuação

* Cada acerto concede 10 pontos
* A pontuação é persistida no banco de dados
* O ranking é gerado a partir dos usuários com maior score

---

## Segurança

* Validação de dados com express-validator
* Headers de segurança com Helmet
* Tokens JWT validados em rotas protegidas
* Senhas não são armazenadas no backend (gerenciadas pelo Cognito)

---

## Variáveis de Ambiente

Exemplo de `.env`:

```
PORT=4000
NODE_ENV=production

FRONTEND_ORIGIN=https://pokeguess41.onrender.com

# AWS Cognito
COGNITO_REGION=us-east-1
COGNITO_CLIENT_ID=xxxxxxxx
COGNITO_USER_POOL_ID=xxxxxxxx

# Redis
REDIS_URL=redis://...

# Database
DATABASE_URL=postgres://...
```

---

## Deploy

* O backend e o frontend são servidos pelo mesmo servidor Express
* O build do React é servido via `express.static`
* Deploy realizado no Render

---

## Autor

Nome: Caio Cunha
Projeto desenvolvido como aplicação full stack para estudo e prática de:

* Node.js
* Express
* AWS Cognito
* Redis
* Integração com APIs externas
* Arquitetura backend

---

## Licença

Este projeto é open-source e pode ser utilizado para fins educacionais.
