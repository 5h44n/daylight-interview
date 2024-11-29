# Emporia Energy API

REST and WebSockets API providing real-time data for Emporia Energy devices

## Tooling

Typescript + ExpressJS + SQLite

CI: Pre-commit hooks via Husky for Prettier (formatting) and ESLint (linting)

## Development

1. Copy `.env.example` to create `.env` and populate required variables.

```bash
cp .env.example .env
```

2. Start app

```
npm run dev
```

3. Run tests

```
npm run test
```

## Models

Since the device and usage data is queried from the Emporia Energy API via the `src/services/emporiaService.ts`, we only have a `User` model for this POC.

### User

- `id`
- `email`
- `password`
- `emporiaUsername`
- `emporiaIdToken`
- `emporiaIdTokenExpiresAt`
- `emporiaRefreshToken`

## Auth

This API assumes a single client app with multiple users. Authentication and authorization is scoped to the `User` level using a token in the request header. There is an additional endpoint for autheticating with Emporia API (making it a separate step so a User could do other things in the client app before integrating their Emporia account). Emporia tokens for each user are stored in the database. The auth flow is:

- User signs up at `/signup`
- User logs in at `/login` and receives an auth token. Future requests from the client will store the token in the `Authorization` header as `Bearer <token>`
- User passes in their Emporia credentials at `/emporia-auth`. The API gets the id (i.e. access) token and refresh token from Emporia and stores it in the database to authenticate future requests to Emporia.

If we were to extend this API to support multiple clients, I would add a `Tenant` model with an `apiKey` and `apiSecret`, and move authentication as well as authorization up to the Tenant level.

_Note about WebSockets_
After establishing the WebSocket connection, the client should send an authentication message:

```
ws.send(JSON.stringify({ type: 'authenticate', token: '<JWT_TOKEN>' }));
```

Upon receiving the 'authenticated' message, the client can start handling 'deviceData' messages for real-time updates.

## REST API

## WebSockets API
