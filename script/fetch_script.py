from utils import get_supabase_client
from datetime import datetime
import requests
import time

def get_hour_aligned_timestamp():
    """Get current timestamp aligned to the hour (minutes and seconds set to 0)"""
    now = datetime.now()
    # Set minutes, seconds, and microseconds to 0
    aligned_time = now.replace(minute=0, second=0, microsecond=0)
    return aligned_time.isoformat()

def fetch_single_page(region="EU", leaderboard_id="battlegrounds", page=1):
    """Fetch a single page of leaderboard data from Hearthstone API"""
    url = "https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData"
    
    params = {
        "region": region,
        "leaderboardId": leaderboard_id,
        "page": page
    }
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        print(f"Successfully fetched page {page} for {region} {leaderboard_id}")
        
        return data
            
    except requests.exceptions.RequestException as e:
        print(f"Error fetching page {page}: {e}")
        return None
    except Exception as e:
        print(f"Error parsing response for page {page}: {e}")
        return None

def save_players_to_database(players_data, region, game_mode, supabase, aligned_timestamp):
    """Save players data to Supabase database with aligned timestamp"""
    try:
        # Prepare players for database insertion
        players_to_insert = []
        for player in players_data:
            player_record = {
                "account_id": player.get('accountid', ''),
                "rank": player.get('rank', 0),
                "rating": player.get('rating', 0),
                "region": region,
                "game_mode": game_mode,
                "scraped_at": aligned_timestamp  # Use the aligned timestamp
            }
            players_to_insert.append(player_record)
        
        # Insert players into database
        result = supabase.table('players').insert(players_to_insert).execute()
        print(f"Successfully saved {len(players_to_insert)} players to database")
        return True
        
    except Exception as e:
        print(f"Error saving players to database: {e}")
        return False

def fetch_and_save_full_leaderboard(region="EU", leaderboard_id="battlegrounds", aligned_timestamp=None):
    """Fetch all pages of the leaderboard and save to database"""
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        print(f"Connected to Supabase for {region} {leaderboard_id}")
        
        # Use provided aligned timestamp or generate one
        if aligned_timestamp is None:
            aligned_timestamp = get_hour_aligned_timestamp()
        
        # Fetch first page to get pagination info
        print("Fetching first page to get pagination info...")
        first_page_data = fetch_single_page(region, leaderboard_id, 1)
        
        if not first_page_data:
            print("Failed to fetch first page")
            return False, 0
        
        # Get pagination info
        total_pages = 1
        if 'leaderboard' in first_page_data and 'pagination' in first_page_data['leaderboard']:
            pagination = first_page_data['leaderboard']['pagination']
            total_pages = pagination.get('totalPages', 1)
            total_size = pagination.get('totalSize', 0)
            print(f"Season ID: {first_page_data.get('seasonId', 'N/A')}")
            print(f"Total pages: {total_pages}")
            print(f"Total players: {total_size}")
        else:
            print("No pagination info found, will only process first page")
        
        total_players_saved = 0
        
        # Save first page data
        if 'leaderboard' in first_page_data and 'rows' in first_page_data['leaderboard']:
            players = first_page_data['leaderboard']['rows']
            print(f"Found {len(players)} players on page 1")
            if save_players_to_database(players, region, leaderboard_id, supabase, aligned_timestamp):
                total_players_saved += len(players)
        
        # Fetch and save remaining pages
        for page in range(2, total_pages + 1):
            print(f"Fetching page {page} of {total_pages}...")
            
            # Add delay to be respectful to the API
            time.sleep(1)
            
            page_data = fetch_single_page(region, leaderboard_id, page)
            if not page_data:
                print(f"Failed to fetch page {page}, skipping...")
                continue
            
            if 'leaderboard' in page_data and 'rows' in page_data['leaderboard']:
                players = page_data['leaderboard']['rows']
                print(f"Found {len(players)} players on page {page}")
                if save_players_to_database(players, region, leaderboard_id, supabase, aligned_timestamp):
                    total_players_saved += len(players)
            else:
                print(f"No player data found on page {page}")
        
        print(f"Completed fetching all {total_pages} pages for {region} {leaderboard_id}")
        return True, total_players_saved
        
    except Exception as e:
        print(f"Error in fetch_and_save_full_leaderboard: {e}")
        return False, 0

def log_scraping_run(supabase, total_players, regions_processed, game_modes_processed, status="success", error_message=None):
    """Log the scraping run to the database"""
    try:
        log_data = {
            "run_time": get_hour_aligned_timestamp(),
            "players_scraped": total_players,
            "regions_processed": regions_processed,
            "game_modes_processed": game_modes_processed,
            "status": status,
            "error_message": error_message
        }
        
        supabase.table('scraping_logs').insert(log_data).execute()
        print(f"Logged scraping run: {total_players} players, status: {status}")
        
    except Exception as e:
        print(f"Error logging scraping run: {e}")

def fetch_all_leaderboards():
    """Fetch all leaderboards for all regions and game modes"""
    regions = ["EU", "US", "AP"]
    game_modes = ["battlegrounds", "battlegroundsduo"]
    
    # Get a single aligned timestamp for this entire run
    aligned_timestamp = get_hour_aligned_timestamp()
    print(f"Using aligned timestamp: {aligned_timestamp}")
    
    success_count = 0
    total_count = len(regions) * len(game_modes)
    total_players_scraped = 0
    processed_regions = []
    processed_game_modes = []
    
    try:
        supabase = get_supabase_client()
        
        for region in regions:
            for game_mode in game_modes:
                print(f"\nFetching {region} {game_mode}...")
                success, players_count = fetch_and_save_full_leaderboard(
                    region=region, 
                    leaderboard_id=game_mode,
                    aligned_timestamp=aligned_timestamp
                )
                
                if success:
                    success_count += 1
                    total_players_scraped += players_count
                    if region not in processed_regions:
                        processed_regions.append(region)
                    if game_mode not in processed_game_modes:
                        processed_game_modes.append(game_mode)

                time.sleep(2)
        
        # Log the scraping run
        status = "success" if success_count == total_count else "partial_success"
        error_msg = None if success_count == total_count else f"Only {success_count}/{total_count} leaderboards completed successfully"
        
        log_scraping_run(
            supabase=supabase,
            total_players=total_players_scraped,
            regions_processed=processed_regions,
            game_modes_processed=processed_game_modes,
            status=status,
            error_message=error_msg
        )
        
        print(f"\nCompleted {success_count}/{total_count} leaderboards successfully")
        print(f"Total players scraped: {total_players_scraped}")
        return success_count == total_count
        
    except Exception as e:
        print(f"Error in fetch_all_leaderboards: {e}")
        
        # Try to log the error
        try:
            supabase = get_supabase_client()
            log_scraping_run(
                supabase=supabase,
                total_players=total_players_scraped,
                regions_processed=processed_regions,
                game_modes_processed=processed_game_modes,
                status="error",
                error_message=str(e)
            )
        except:
            pass  # If logging fails, just continue
        
        return False


if __name__ == "__main__":
    
    print("\nFetching all leaderboards...")
    success = fetch_all_leaderboards()
    
    if success:
        print("Successfully completed all leaderboard operations")
    else:
        print("Some leaderboard operations failed")