import { useEffect, useState } from "react"
import type { WebBaselineApiResponse } from "./types/types"
import { WEB_STATUS_URL } from "./constants"
import axios from 'axios'
import { InfoComponent } from "./components/ContentInfo"
function App() {
  const [apiData, setApiData] = useState<WebBaselineApiResponse>()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchApiData = async (query: string) => {
    try {
      if(query === "") return;
      setLoading(true)
      const encodedQuery = encodeURIComponent(query)
      const response = await axios.get(`${WEB_STATUS_URL}${encodedQuery}`)
      console.log(response.data)
      setApiData(response.data)
    } catch (error) {
      console.error('Error fetching API data:', error)
      setApiData(undefined)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApiData(query)
  }, [])

  useEffect(()=>{
    const handleMessage = (event:MessageEvent) =>{
      const message = event.data;
      if(message.command === "updateQuery"){
        console.log("received")
        const newQuery = message.query;
        setQuery(newQuery);
        fetchApiData(newQuery);
      }
    }

    window.addEventListener("message",handleMessage)

    return ()=>{
      window.removeEventListener('message',handleMessage);
    }
  })

  const handleSearch = () => {
    fetchApiData(query)
  }

  return (
    <div className="bg-neutral-800 min-h-screen p-6">
      <h1 className="text-white text-2xl font-bold mb-4">Web Status Checker</h1>

      {/* Search Bar */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e)=> e.key === "Enter" ? handleSearch() :""}
          placeholder="Enter query (e.g., id:grid)"
          className="flex-1 p-2 rounded-md text-black"
        />
        <button
          onClick={handleSearch}
          className="bg-white/30 hover:bg-white/50 text-white px-4 rounded-md"
        >
          Search
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && <p className="text-white/80">Loading...</p>}

      {/* Information Component */}
      <InfoComponent data={apiData} />
    </div>
  )
}

export default App