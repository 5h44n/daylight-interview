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

If we were to extend this API to support multiple clients, I would add a `Tenant` model with an `apiKey` and `apiSecret`, and move authentication as well as authorization up to the `Tenant` scope.

**Note about WebSockets**
After establishing the WebSocket connection, the client should send an authentication message:

```
ws.send(JSON.stringify({ type: 'authenticate', token: '<JWT_TOKEN>' }));
```

Upon receiving the 'authenticated' message, the client can start handling 'deviceData' messages for real-time updates.

## REST API

The API provides the following RESTful endpoints for interacting with the Emporia Energy devices and user authentication.

### Public Endpoints

These endpoints are accessible without authentication.

#### **POST** `/signup`

- **Description:** Register a new user account.
- **Request Body:**
  - `email` (_string_, required): User's email address.
  - `password` (_string_, required): User's password.
- **Responses:**
  - `201 Created`: User registration successful. Returns the created user object (without the password).
  - `400 Bad Request`: Email or password is missing.
  - `409 Conflict`: A user with the given email already exists.

#### **POST** `/login`

- **Description:** Log in an existing user to receive a JWT token for authenticated requests.
- **Request Body:**
  - `email` (_string_, required): User's email address.
  - `password` (_string_, required): User's password.
- **Responses:**
  - `200 OK`: Login successful. Returns a JWT token for authentication.
  - `400 Bad Request`: Email or password is missing.
  - `401 Unauthorized`: Invalid email or password.

### Protected Endpoints

These endpoints require authentication via a JWT token passed in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

#### **GET** `/me`

- **Description:** Retrieve the authenticated user's information.
- **Responses:**
  - `200 OK`: Returns the user object (without the password).
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `404 Not Found`: User not found.

#### **POST** `/emporia-auth`

- **Description:** Authenticate the user with the Emporia Energy API and store tokens for accessing Emporia services.
- **Request Body:**
  - `emporiaUsername` (_string_, required): Emporia account username.
  - `emporiaPassword` (_string_, required): Emporia account password.
- **Responses:**
  - `200 OK`: Emporia authentication successful.
  - `400 Bad Request`: Missing credentials or authentication failed.
  - `404 Not Found`: User not found.

#### **GET** `/devices`

- **Description:** Retrieve the list of Emporia devices associated with the authenticated user.
- **Responses:**
  - `200 OK`: Returns the user's devices.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `404 Not Found`: User not found.
  - `400 Bad Request`: Failed to fetch devices.

#### **GET** `/devices/:id/history`

- **Description:** Get historical usage data for a specific device.
- **URL Parameters:**
  - `id` (_number_, required): The `deviceGid` of the device.
- **Query Parameters:**
  - `channels` (_array of numbers_, required): Channel numbers to query.
  - `start` (_ISO 8601 string_, required): Start date and time.
  - `end` (_ISO 8601 string_, required): End date and time.
  - `scale` (_string_, required): Time scale (e.g., `1H` for one hour).
  - `energyUnit` (_string_, required): Unit of energy (e.g., `KilowattHours`).
- **Responses:**
  - `200 OK`: Returns usage data and timestamps.
  - `400 Bad Request`: Missing or invalid query parameters.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `404 Not Found`: User not found.

#### **GET** `/devices/instant`

- **Description:** Get instant (real-time) usage data for devices.
- **Query Parameters:**
  - `devices` (_array of numbers_, optional): List of `deviceGid`s. If omitted, data for all user devices is returned.
  - `instant` (_ISO 8601 string_, required): The specific instant (timestamp) for which to retrieve data.
  - `scale` (_string_, required): Time scale (e.g., `1MIN` for one minute).
  - `energyUnit` (_string_, required): Unit of energy (e.g., `KilowattHours`).
- **Responses:**
  - `200 OK`: Returns instant usage data for the specified devices.
  - `400 Bad Request`: Missing or invalid query parameters.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `404 Not Found`: User not found.

---

**Error Response Format:**

For all endpoints, errors are returned in the following JSON format:

```json
{
  "error": "Description of the error."
}
```

---

## WebSockets API

The API provides a WebSocket endpoint for real-time streaming of device data. This allows clients to receive instant updates without the need to poll the REST API.

### **Endpoint URL**

The WebSocket server runs on the same host and port as the REST API. The WebSocket endpoint can be accessed using the same base URL as the REST API.

- **WebSocket URL:** `ws://<host>:<port>`

  - Replace `<host>` with your server's hostname (e.g., `localhost`).
  - Replace `<port>` with the port your server is running on (default is `3000`).

### **Connection Protocol**

1. **Establish WebSocket Connection**

   - Open a WebSocket connection to the server.
   - Example using JavaScript:

     ```javascript
     const ws = new WebSocket('ws://localhost:3000');
     ```

2. **Authenticate**

   - After establishing the connection, the client **must** send an authentication message containing a valid JWT token obtained from the `/login` endpoint.
   - The message should be a JSON string with the following format:

     ```json
     {
       "type": "authenticate",
       "token": "<JWT_TOKEN>"
     }
     ```

   - Example:

     ```javascript
     ws.onopen = function () {
       ws.send(JSON.stringify({ type: 'authenticate', token: '<JWT_TOKEN>' }));
     };
     ```

3. **Receive Authentication Response**

   - The server will respond with an authentication confirmation or an error.
   - Successful authentication response:

     ```json
     {
       "type": "authenticated",
       "message": "Authentication successful."
     }
     ```

   - Error response for failed authentication:

     ```json
     {
       "type": "error",
       "message": "Invalid or expired token."
     }
     ```

### **Real-Time Data Streaming**

- Upon successful authentication, the server will start sending real-time device data to the client.
- The data messages have the following format:

  ```json
  {
    "type": "deviceData",
    "data": {
      "deviceListUsages": {
        "instant": "<timestamp>",
        "scale": "1MIN",
        "devices": [
          {
            "deviceGid": <number>,
            "channelUsages": [ /* Array of channel usage data */ ]
          }
          // Additional devices...
        ],
        "energyUnit": "KilowattHours"
      }
    }
  }
  ```

- The `data` field contains the same structure as the response from the `/devices/instant` REST endpoint.
- Data is sent at regular intervals (every **second**) to provide up-to-date information on device usage.

### **Message Types**

#### **Authenticate**

- **Client to Server:**

  ```json
  {
    "type": "authenticate",
    "token": "<JWT_TOKEN>"
  }
  ```

- **Server to Client (Success):**

  ```json
  {
    "type": "authenticated",
    "message": "Authentication successful."
  }
  ```

- **Server to Client (Failure):**

  ```json
  {
    "type": "error",
    "message": "Invalid or expired token."
  }
  ```

#### **Device Data**

- **Server to Client:**

  ```json
  {
    "type": "deviceData",
    "data": {
      /* Device usage data */
    }
  }
  ```

#### **Error Messages**

- **Server to Client:**

  ```json
  {
    "type": "error",
    "message": "Description of the error."
  }
  ```

### **Error Handling**

- If the client sends messages before authenticating, the server will respond with an error message:

  ```json
  {
    "type": "error",
    "message": "Please authenticate first."
  }
  ```

- If authentication fails, the server will send an error message and close the connection.
- It's important to handle these errors on the client side to ensure a smooth user experience.

### **Closing the Connection**

- The client can close the WebSocket connection at any time.
- The server will automatically clean up resources when the connection is closed.
- Example:

  ```javascript
  ws.close();
  ```

### **Example Client Implementation**

Here's a basic example of how a client can connect to the WebSocket server, authenticate, and handle incoming messages:

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = function () {
  // Replace <JWT_TOKEN> with your actual token from the /login endpoint
  ws.send(JSON.stringify({ type: 'authenticate', token: '<JWT_TOKEN>' }));
};

ws.onmessage = function (event) {
  const message = JSON.parse(event.data);
  switch (message.type) {
    case 'authenticated':
      console.log('Authentication successful.');
      break;
    case 'deviceData':
      console.log('Received device data:', message.data);
      // Process the device data as needed
      break;
    case 'error':
      console.error('Error:', message.message);
      break;
    default:
      console.warn('Unknown message type:', message.type);
  }
};

ws.onclose = function () {
  console.log('WebSocket connection closed.');
};

ws.onerror = function (error) {
  console.error('WebSocket error:', error);
};
```
