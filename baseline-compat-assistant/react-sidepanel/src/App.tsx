import { useEffect, useState } from 'react'
import type { WebBaselineApiResponse, FeatureData } from './types/types'
import { WEB_STATUS_URL } from './constants'
import { FeatureCard } from './components/FeatureCard'
import { FeatureDetail } from './components/FeatureDetail'
import { Search } from 'lucide-react'

// @ts-expect-error no definition default
const vscode = acquireVsCodeApi();

function App() {
  const [apiData, setApiData] = useState<WebBaselineApiResponse>()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<FeatureData | null>(null)
  const [selectedSearchMode, setSelectedSearchMode] = useState<"Name" | "Id">("Name")

const fetchApiData = async (query: string) => {
    if (query.trim() === '') return;
    try {
      setLoading(true);
      let searchQuery = query;
      if (selectedSearchMode === "Id") {
        searchQuery = `id:${query}`;
      }
      const encodedQuery = encodeURIComponent(searchQuery);

      // 1. Ask the extension to fetch the data
      vscode.postMessage({
        command: 'fetchApiData',
        url: `${WEB_STATUS_URL}${encodedQuery}`
      });

    } catch (error) {
      console.error('Error requesting API data:', error);
      setApiData(undefined);
      setLoading(false); // Make sure to handle loading state on error
    }
  };


  // Fetch data whenever query or search mode changes
  useEffect(() => {
    if (query !== '') {
      fetchApiData(query)
    }
  }, [query, selectedSearchMode])

  // inside your React app (in useEffect at the root)
  useEffect(() => {
    window.parent.postMessage({ command: "ready" }, "*");
  }, []);

useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'apiDataResponse') {
        if(message.error) {
           console.error('Error fetching API data:', message.error);
           setApiData(undefined);
        } else {
           setApiData(message.data);
        }
        setLoading(false);
      }
      // Keep your existing message handler for 'updateQuery'
      if (message.command === 'updateQuery') {
        setQuery(message.query);
        setSelectedFeature(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  const handleSearch = () => {
    if (query.trim() !== '') {
      setQuery(query) // triggers fetch via useEffect
      setSelectedFeature(null)
    }
  }

  const handleFeatureClick = (feature: FeatureData) => {
    setSelectedFeature(feature)
  }

  const handleBack = () => {
    setSelectedFeature(null)
  }

  // Detail page
  if (selectedFeature) {
    return (
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 min-h-screen p-6">
        <FeatureDetail feature={selectedFeature} onBack={handleBack} />
      </div>
    )
  }

  // Main page
  return (
    <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className='flex justify-between'>
          <h1 className="text-white text-3xl font-bold mb-8">Web Status Checker</h1>
          <div className='grid grid-cols-2 text-center gap-2 text-white bg-neutral-700 rounded-xl px-2 h-fit py-2 text-lg items-center justify-center'>
            <div
              className={`${selectedSearchMode === "Name" ? "bg-neutral-800/90" : ""} p-1 cursor-pointer rounded-lg px-2`}
              onClick={() => setSelectedSearchMode("Name")}
            >
              Name
            </div>
            <div
              className={`${selectedSearchMode === "Id" ? "bg-neutral-800/90" : ""} p-1 cursor-pointer rounded-lg px-2`}
              onClick={() => setSelectedSearchMode("Id")}
            >
              Id
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => (e.key === 'Enter' ? handleSearch() : undefined)}
            placeholder="Search features (e.g., id:grid, name:flexbox)"
            className="w-full pl-12 pr-32 py-4 bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
          />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-lg transition-colors font-medium"
          >
            Search
          </button>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-neutral-600 border-t-sky-500 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Results */}
        {!loading && apiData && apiData.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apiData.data.map((feature: FeatureData) => (
              <FeatureCard
                key={feature.feature_id}
                feature={feature}
                onClick={() => handleFeatureClick(feature)}
              />
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && apiData && apiData.data.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-400 text-lg">No features found. Try a different search query.</p>
          </div>
        )}

        {/* Nothing searched yet */}
        {!loading && !apiData && query === '' && (
          <div className="text-center py-12">
            <p className="text-neutral-400 text-lg">Enter a search query to find web features.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
