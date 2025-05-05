# Echo Backend Service

[![Known Vulnerabilities](https://snyk.io/test/github/EchoRag/echo_fe/badge.svg)](https://snyk.io/test/github/EchoRag/echo_fe)

[![codecov](https://codecov.io/gh/EchoRag/echo_be/graph/badge.svg?token=OH7UKUPQTZ)](https://codecov.io/gh/EchoRag/echo_be)



A Node.js + TypeScript + Express backend service with PostgreSQL, Clerk authentication, and Swagger documentation.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- Clerk account for authentication

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your configuration:
   - Set up your PostgreSQL database credentials
   - Add your Clerk API keys
   - Configure other environment variables as needed

## Development

Start the development server:
```bash
npm run dev
```

The server will start on http://localhost:3000 (or the port specified in your .env file).

## API Documentation

Access the Swagger documentation at:
```
http://localhost:3000/api-docs
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate test coverage report:
```bash
npm run test:coverage
```

## Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── middlewares/    # Express middlewares
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── test/           # Test files
```

## Features

- TypeScript support
- PostgreSQL with TypeORM
- Clerk authentication
- Swagger API documentation
- Rate limiting
- Error handling
- Security headers (Helmet)
- CORS support
- Request logging (Morgan)
- Jest testing setup 