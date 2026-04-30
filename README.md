# PersonaChat

PersonaChat is a multi-persona AI chatbot built with Next.js and Gemini. It lets you switch between different AI personalities, each with its own tone, style, and suggested questions. The app is designed for a polished chat experience with persona-specific avatars, formatted responses, code rendering, and a responsive layout that works well on desktop and mobile.

## Live Demo

- Vercel deployment: [**multi-persona-chatbot**](https://multi-persona-chatbot.vercel.app/)

If you already have a Vercel URL, replace the line above with your live site link.

## Features

- Switch between three distinct personas:
  - Anshuman Singh
  - Abhimanyu Saxena
  - Kshitij Mishra
- Persona-specific avatars in the chat UI
- Response formatting for:
  - Markdown-style emphasis
  - Inline code
  - Code blocks with copy support
  - Newlines and lists
- Suggested starter questions for each persona
- Mobile-responsive chat layout
- Sticky conversation header with the active persona
- Internal chat scrolling so the page height stays fixed
- Gemini fallback chain for better reliability when a model is rate-limited

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Google Gemini API via `@google/genai`
- `react-markdown`, `remark-gfm`, and `remark-breaks` for message formatting

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- A Gemini API key from Google AI Studio

### 1. Clone the repository

```bash
git clone https://github.com/Divii2205/Multi-Persona-Chatbot.git
cd Multi-Persona-Chatbot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment variables

Create a file named `.env.local` in the project root and add:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the development server

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Deployment on Vercel

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add the `GEMINI_API_KEY` environment variable in the Vercel project settings.
4. Deploy the app.

For the live demo section above, paste your final Vercel URL once the deployment is ready.

## Screenshots

### Desktop

![Desktop chat view 01](src/public/Chat%20Screen%2001.png)

![Desktop chat view 02](src/public/Chat%20Screen%2002.png)

## Project Structure

```text
src/
  app/
    api/chat/route.ts
    globals.css
    layout.tsx
    page.tsx
  lib/
    personas.ts
  services/
    gemini.ts
```

## Notes

- Each persona runs as a fresh conversation when you switch personas.
- The app uses a fallback model chain to improve reliability when Gemini rate limits occur.
- Responses are rendered with markdown-aware formatting so code and line breaks display cleanly.
