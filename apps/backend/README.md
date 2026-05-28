# Baita Serverless

Backend application for BaitaHelp: the app that helps you to automate your life. This is a personal project that was inspired by standard workflow automation tools, but aimed at normal people.

API docs available at: **https://api.baita.help**

## Tech stack

- **Runtime**: Node.js 20.x + TypeScript 5.9 (strict null checks)
- **Framework**: Serverless Framework 3.40
- **Cloud**: AWS (Lambda, DynamoDB, S3, SQS, EventBridge Scheduler, CloudWatch, API Gateway)
- **Validation**: AJV (JSON Schema)
- **HTTP Client**: Axios
- **Auth**: Auth0 (JWT verification)
- **Push Notifications**: Firebase Admin SDK
- **Testing**: Jest 30 + ts-jest
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions (lint → test → deploy on push to master)

## Project status

This project is currently in development.

## Key capabilities

- REST API with standardized request/response format
- Data storage (DynamoDB, single-table design)
- JSON schema validation (AJV)
- Request authentication (Auth0)
- Fully automated CI/CD (GitHub Actions → lint → test → deploy)
- Safe and isolated code execution mechanism (Node.js VM)
- OAuth integrations (Gmail, Pipedrive, OpenAI)
- Centralized error handling and logging (AWS CloudWatch)
- Custom domain https://api.baita.help (AWS Route53)
- Code linting and formatting (ESLint + Prettier)
- Unit tests (Jest)

## Database

Storage uses DynamoDB on a single table design. Here are the data schemas:

PK     | SK                             | Definition
------ | ------------------------------ | ----------
userId | #USER                          | User
userId | #BOT#{botId}                   | Bot
userId | #{resourceName}#{resourceId}   | Generic resource
userId | #CONTENT#{contentId}           | Content
userId | #CONNECTION#{connectionId}     | Connection

## Installation and Setup Instructions

Clone down this repository. You will need `node` and `npm` installed globally on your machine.

Installation:

`npm install --legacy-peer-deps`

To Run Test Suite (Jest):

`npm test`

To Run Tests Once (CI-friendly):

`npm run test:run`

To Start Server:

`npm start`

To Access API:

`localhost:5000/dev`

To Run Code linting (ESLint):

`npm run lint`

To Run Code formatting (Prettier):

`npm run format`

## Local Development

Requires:
1. AWS CLI configured with profile `joao` (`~/.aws/credentials`)
2. Partner secrets in `src/partners/*/secrets.json` (gitignored — see CLAUDE.md for details)
3. Node.js 20.x

## CI/CD Pipeline

GitHub Actions workflow runs on push to `master`:
1. **Test job**: Install → Lint → Jest
2. **Deploy job**: Install → Create secrets → Configure AWS → `serverless deploy --stage prod`
