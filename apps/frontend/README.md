# Baita frontend

Frontend application for BaitaHelp: the app that helps you to automate your life. This is a personal project that was inspired by Zapier's architecture, but aimed at normal people.

Available at: **https://baita.help**

## Tech stack

- **Framework**: React 18 + TypeScript 6 (strict mode)
- **Build tool**: Vite 8 with @vitejs/plugin-react
- **Routing**: React Router v6
- **State management**: React Context API
- **UI**: MUI Material v5, SCSS, Bootstrap 5 utilities
- **HTTP client**: Axios
- **Authentication**: Auth0 (@auth0/auth0-react)
- **Push notifications & Analytics**: Firebase (production only)
- **PWA**: vite-plugin-pwa (Workbox-based service worker)
- **Testing**: Vitest + React Testing Library
- **Linting & Formatting**: ESLint + Prettier
- **CI/CD**: AWS Amplify
- **Domain**: AWS Route53 (baita.help)

## Project status

This project is currently in development. For now, users are able to:

- Login using e-mail/password and also via 3rd party login platforms like Google.
- Manage your TO DO list
- Check personal info and daily progress
- Manage automation bots and follow its activities
- Check and interact with your favorite content

## Key capabilities

- Install app (progressive web app)
- Multi language with automatic detection (en-US, pt-BR)
- Login using 3rd party authentication services (Auth0)
- State management (React Context)
- Local mock server (Vite plugin)
- Receiving push notifications (Firebase)
- Centralized collection of usage analytics (Firebase)
- Centralized error handling and logging (react-error-boundary + Firebase)
- CI/CD fully managed (AWS Amplify)
- Custom domain https://baita.help (AWS Route53)
- Code linting and formatting (ESLint + Prettier)

## Installation and Setup Instructions

Clone down this repository. You will need `node` and `npm` installed globally on your machine.

Installation:

`npm install`

To start the dev server:

`npm run dev`

To visit the app:

`localhost:3000`

To run the production build:

`npm run build`

To preview the production build:

`npm run preview`

To run tests:

`npm run test:run`

To run tests in watch mode:

`npm run test`

To run code linting:

`npm run lint`

To run code formatting:

`npm run format`

## Main pages

**Landing page**: Welcome message (initial page for not authenticated users)
![Alt text](src/assets/readme/landingPage.png)

**Todo page**: Manage your TO DO list (initial page for authenticated users)
![Alt text](src/assets/readme/todoPage.png)

**Profile page**: Check personal info and daily progress
![Alt text](src/assets/readme/profilePage.png)

**Bots page**: Manage automation bots
![Alt text](src/assets/readme/botsPage.png)

**Logs page**: Check automation bots activities
![Alt text](src/assets/readme/logsPage.png)

**New Bot page**: Create new automation bot
![Alt text](src/assets/readme/newBotPage.png)

**Feed page**: Check and interact with your favorite content
![Alt text](src/assets/readme/feedPage.png)
