-- Drop the table if it exists to start clean
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS scraping_logs;

-- Create players table for hourly snapshots with game mode support
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    rank INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    region TEXT NOT NULL,
    game_mode TEXT NOT NULL, -- 'battlegrounds' or 'battlegrounds_duos'
    scraped_at TIMESTAMP NOT NULL -- This will be aligned to the hour
);

-- Create basic indexes
CREATE INDEX idx_players_rank ON players(rank);
CREATE INDEX idx_players_account_id ON players(account_id);
CREATE INDEX idx_players_region ON players(region);
CREATE INDEX idx_players_game_mode ON players(game_mode);
CREATE INDEX idx_players_scraped_at ON players(scraped_at);
CREATE INDEX idx_players_account_time ON players(account_id, scraped_at);
CREATE INDEX idx_players_region_mode ON players(region, game_mode);

-- Create scraping logs table to track runs
CREATE TABLE scraping_logs (
    id SERIAL PRIMARY KEY,
    run_time TIMESTAMP NOT NULL,
    players_scraped INTEGER NOT NULL,
    regions_processed TEXT[] NOT NULL,
    game_modes_processed TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT
);

-- Create index for scraping logs
CREATE INDEX idx_scraping_logs_run_time ON scraping_logs(run_time);
CREATE INDEX idx_scraping_logs_status ON scraping_logs(status);