import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

interface Player {
  id: number
  account_id: string
  rank: number
  rating: number
  region: string
  game_mode: string
  scraped_at: string
}

function App() {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('EU')
  const [selectedGameMode, setSelectedGameMode] = useState('battlegrounds')
  const [searchRank, setSearchRank] = useState('')
  const [searchName, setSearchName] = useState('')
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [highestRating, setHighestRating] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Fetch players from Supabase
  const fetchPlayers = async () => {
    setIsLoading(true)
    try {
      // First, get the most recent scraped_at timestamp for this region/game_mode
      const { data: latestTimestamp } = await supabase
        .from('players')
        .select('scraped_at')
        .eq('region', selectedRegion)
        .eq('game_mode', selectedGameMode)
        .order('scraped_at', { ascending: false })
        .limit(1)

      if (!latestTimestamp || latestTimestamp.length === 0) {
        setPlayers([])
        setTotalPlayers(0)
        setHighestRating(0)
        setLastUpdated('')
        return
      }

      const mostRecentTimestamp = latestTimestamp[0].scraped_at

      // Now fetch players with the most recent timestamp
      let query = supabase
        .from('players')
        .select('*')
        .eq('region', selectedRegion)
        .eq('game_mode', selectedGameMode)
        .eq('scraped_at', mostRecentTimestamp)
        .order('rank', { ascending: true })

      // Apply filters
      if (searchRank) {
        query = query.eq('rank', parseInt(searchRank))
      }

      if (searchName) {
        query = query.ilike('account_id', `%${searchName}%`)
      }

      // Limit results
      if (!searchRank && !searchName) {
        query = query.limit(10)
      }

      const { data, error } = await query

      if (error) throw error

      setPlayers(data || [])

      // Get stats for the current selection (only from most recent timestamp)
      const { count: totalCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('region', selectedRegion)
        .eq('game_mode', selectedGameMode)
        .eq('scraped_at', mostRecentTimestamp)

      const { data: maxRatingData } = await supabase
        .from('players')
        .select('rating')
        .eq('region', selectedRegion)
        .eq('game_mode', selectedGameMode)
        .eq('scraped_at', mostRecentTimestamp)
        .order('rating', { ascending: false })
        .limit(1)

      if (totalCount !== null) {
        setTotalPlayers(totalCount)
      }

      if (maxRatingData && maxRatingData.length > 0) {
        setHighestRating(maxRatingData[0].rating)
      }

      setLastUpdated(mostRecentTimestamp)

    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data when filters change
  useEffect(() => {
    fetchPlayers()
  }, [selectedRegion, selectedGameMode])

  const handleSearch = () => {
    fetchPlayers()
  }

  const clearFilters = () => {
    setSearchRank('')
    setSearchName('')
    fetchPlayers()
  }

  const formatLastUpdated = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMinutes < 60) return `${diffMinutes} min ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`
    return `${Math.floor(diffMinutes / 1440)} days ago`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-xl">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-center mb-2">
            Hearthstone Battlegrounds Leaderboard
          </h1>
          <p className="text-center text-blue-100 text-lg">
            Track top players across all regions and game modes
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Search & Filter</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Region Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="EU">Europe</option>
                <option value="US">Americas</option>
                <option value="AP">Asia-Pacific</option>
              </select>
            </div>

            {/* Game Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Game Mode</label>
              <select
                value={selectedGameMode}
                onChange={(e) => setSelectedGameMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="battlegrounds">Battlegrounds</option>
                <option value="battlegroundsduo">Battlegrounds Duos</option>
              </select>
            </div>

            {/* Rank Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search by Rank</label>
              <input
                type="number"
                placeholder="Enter rank number"
                value={searchRank}
                onChange={(e) => setSearchRank(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Name Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search by Name</label>
              <input
                type="text"
                placeholder="Enter player name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Search Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Players</h3>
            <p className="text-3xl font-bold text-blue-600">{totalPlayers.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Highest Rating</h3>
            <p className="text-3xl font-bold text-green-600">{highestRating.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Last Updated</h3>
            <p className="text-3xl font-bold text-purple-600">{formatLastUpdated(lastUpdated)}</p>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-800">
              {searchRank || searchName ? 'Search Results' : 'Top Players'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedRegion} - {selectedGameMode === 'battlegrounds' ? 'Battlegrounds' : 'Battlegrounds Duos'}
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading players...</span>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No players found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Game Mode
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                            player.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                            player.rank === 2 ? 'bg-gray-100 text-gray-800' :
                            player.rank === 3 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {player.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{player.account_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-semibold">{player.rating.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {player.region}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          {player.game_mode === 'battlegrounds' ? 'BG' : 'BG Duos'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App