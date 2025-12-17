# Portfolio

A personal portfolio website built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

Start the dev server:

```bash
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173)

### Build

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Linting

Run ESLint:

```bash
npm run lint
```

## Project Structure

```
portfolio/
├── src/
│   ├── assets/       # Static assets (images, icons)
│   ├── App.tsx       # Main app component
│   ├── main.tsx      # Entry point
│   └── index.css     # Global styles with Tailwind directives
├── public/           # Public static files
└── dist/             # Build output (generated)
```

## Customization

- **Tailwind Configuration**: Edit [tailwind.config.cjs](tailwind.config.cjs)
- **Vite Configuration**: Edit [vite.config.ts](vite.config.ts)
- **TypeScript Configuration**: Edit [tsconfig.json](tsconfig.json) and [tsconfig.app.json](tsconfig.app.json)

## License

MIT
