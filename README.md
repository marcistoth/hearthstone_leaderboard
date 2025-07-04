# Hearthstone Battlegrounds Leaderboard

A web application that tracks Hearthstone Battlegrounds leaderboard data across all regions and game modes.

## Features

- **Real-time Leaderboard**: View top players from EU, US, and Asia-Pacific regions
- **Multiple Game Modes**: Support for both Battlegrounds and Battlegrounds Duos
- **Search & Filter**: Find players by rank or name
- **Automated Data Collection**: Hourly scraping via GitHub Actions
- **Responsive Design**: Built with React and Tailwind CSS

## Project Structure

```
├── frontend/          # React frontend application
├── script/           # Python scraping scripts
├── .github/workflows/ # GitHub Actions for automation
└── README.md
```

## Setup

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend Scripts
```bash
cd script
pip install -r requirements.txt
python fetch_script.py
```

## Deployment

The frontend is deployed via GitHub Pages:
```bash
cd frontend
npm run deploy
```

## Environment Variables

Create `.env` files in both root and frontend directories with your Supabase credentials.