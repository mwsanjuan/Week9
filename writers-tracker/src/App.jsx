import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [writers, setWriters] = useState([])
  const [newWriter, setNewWriter] = useState('')
  const [expandedWriter, setExpandedWriter] = useState(null)
  const [newQuote, setNewQuote] = useState('')
  const [loadingImages, setLoadingImages] = useState({})
  const [suggestedQuotes, setSuggestedQuotes] = useState({})
  const [loadingQuotes, setLoadingQuotes] = useState({})

  const searchWriterImage = async (writerName) => {
    try {
      console.log('Searching for writer image:', writerName);
      
      // Using a simple image search API
      const response = await axios.get(`https://source.unsplash.com/featured/?${encodeURIComponent(writerName + ' author portrait')}`);
      
      if (response.request.responseURL) {
        console.log('Found image:', response.request.responseURL);
        return response.request.responseURL;
      }
      
      // If no image found, try a more general search
      console.log('No image found in first search, trying general search...');
      const generalResponse = await axios.get(`https://source.unsplash.com/featured/?${encodeURIComponent(writerName)}`);
      
      if (generalResponse.request.responseURL) {
        console.log('Found image in general search:', generalResponse.request.responseURL);
        return generalResponse.request.responseURL;
      }
      
      console.log('No images found, using fallback');
      // Fallback to a placeholder image if no image is found
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(writerName)}&background=f8b4d9&color=fff&size=200`;
    } catch (error) {
      console.error('Error fetching image:', error);
      // Fallback to placeholder image on error
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(writerName)}&background=f8b4d9&color=fff&size=200`;
    }
  }

  const addWriter = async (e) => {
    e.preventDefault()
    if (newWriter.trim()) {
      const writerName = newWriter.trim()
      setLoadingImages(prev => ({ ...prev, [writerName]: true }))
      
      console.log('Adding new writer:', writerName);
      const profileImage = await searchWriterImage(writerName)
      console.log('Got profile image:', profileImage);
      
      setWriters([...writers, {
        id: Date.now(),
        name: writerName,
        bio: '',
        isFavorite: false,
        quotes: [],
        profileImage
      }])
      
      setNewWriter('')
      setLoadingImages(prev => ({ ...prev, [writerName]: false }))
    }
  }

  const removeWriter = (id) => {
    setWriters(writers.filter(writer => writer.id !== id))
    if (expandedWriter === id) {
      setExpandedWriter(null)
    }
  }

  const toggleFavorite = (id) => {
    setWriters(writers.map(writer => 
      writer.id === id ? { ...writer, isFavorite: !writer.isFavorite } : writer
    ))
  }

  const updateBio = (id, bio) => {
    setWriters(writers.map(writer =>
      writer.id === id ? { ...writer, bio } : writer
    ))
  }

  const addQuote = (writerId) => {
    if (newQuote.trim()) {
      setWriters(writers.map(writer =>
        writer.id === writerId
          ? { ...writer, quotes: [...writer.quotes, { id: Date.now(), text: newQuote.trim() }] }
          : writer
      ))
      setNewQuote('')
    }
  }

  const removeQuote = (writerId, quoteId) => {
    setWriters(writers.map(writer =>
      writer.id === writerId
        ? { ...writer, quotes: writer.quotes.filter(quote => quote.id !== quoteId) }
        : writer
    ))
  }

  const fetchSuggestedQuotes = async (writerName) => {
    try {
      console.log('Fetching suggested quotes for:', writerName);
      setLoadingQuotes(prev => ({ ...prev, [writerName]: true }))
      
      // Check if API key exists
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        console.error('OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to your .env file');
        throw new Error('API key missing');
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a literary expert. Generate 3 authentic quotes that were actually written by ${writerName}. Make sure the quotes are accurate and well-known. Format each quote as a separate string in an array.`
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('API Response:', response.data);

      // Improved quote processing
      const content = response.data.choices[0].message.content;
      const quotes = content
        .split('\n')
        .map(quote => quote.trim())
        .filter(quote => quote && !quote.startsWith('[') && !quote.startsWith(']'))
        .map(quote => quote.replace(/^["']|["']$/g, '').trim())
        .slice(0, 3);

      console.log('Processed quotes:', quotes);
      setSuggestedQuotes(prev => ({ ...prev, [writerName]: quotes }))
    } catch (error) {
      console.error('Error fetching suggested quotes:', error.message);
      if (error.response) {
        console.error('API Error Response:', error.response.data);
      }
      setSuggestedQuotes(prev => ({ ...prev, [writerName]: [] }))
    } finally {
      setLoadingQuotes(prev => ({ ...prev, [writerName]: false }))
    }
  }

  const handleWriterExpand = (writerId, writerName) => {
    console.log('Expanding writer:', writerName, 'ID:', writerId);
    setExpandedWriter(expandedWriter === writerId ? null : writerId)
    if (expandedWriter !== writerId) {
      console.log('Fetching quotes for newly expanded writer');
      fetchSuggestedQuotes(writerName)
    }
  }

  const addSuggestedQuote = (writerId, quote) => {
    setWriters(writers.map(writer =>
      writer.id === writerId
        ? { ...writer, quotes: [...writer.quotes, { id: Date.now(), text: quote }] }
        : writer
    ))
  }

  return (
    <div className="app-container">
      <h1>Writer Repository</h1>
      
      <form onSubmit={addWriter} className="writer-form">
        <input
          type="text"
          value={newWriter}
          onChange={(e) => setNewWriter(e.target.value)}
          placeholder="Add a new writer..."
          className="writer-input"
        />
        <button type="submit" className="add-button">
          {loadingImages[newWriter] ? 'Adding...' : 'Add Writer'}
        </button>
      </form>

      <div className="writers-list">
        {writers.map(writer => (
          <div key={writer.id} className="writer-item">
            <div className="writer-header" onClick={() => handleWriterExpand(writer.id, writer.name)}>
              <div className="writer-profile-container">
                <img 
                  src={writer.profileImage} 
                  alt={`${writer.name}'s profile`} 
                  className="writer-profile-image"
                />
                <div className="writer-info">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(writer.id)
                    }}
                    className={`favorite-button ${writer.isFavorite ? 'favorited' : ''}`}
                  >
                    ★
                  </button>
                  <span className="writer-name">{writer.name}</span>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  removeWriter(writer.id)
                }}
                className="remove-button"
              >
                ×
              </button>
            </div>

            {expandedWriter === writer.id && (
              <div className="writer-profile">
                <div className="bio-section">
                  <h3>Bio</h3>
                  <textarea
                    value={writer.bio}
                    onChange={(e) => updateBio(writer.id, e.target.value)}
                    placeholder="Add a bio for this writer..."
                    className="bio-input"
                  />
                </div>

                <div className="quotes-section">
                  <h3>Quotes</h3>
                  
                  {/* Suggested Quotes Section */}
                  {suggestedQuotes[writer.name] && suggestedQuotes[writer.name].length > 0 && (
                    <div className="suggested-quotes">
                      <h4>Suggested Quotes</h4>
                      <div className="suggested-quotes-list">
                        {suggestedQuotes[writer.name].map((quote, index) => (
                          <div key={index} className="suggested-quote-item">
                            <p>{quote}</p>
                            <button
                              onClick={() => addSuggestedQuote(writer.id, quote)}
                              className="add-suggested-quote-button"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {loadingQuotes[writer.name] && (
                    <div className="loading-quotes">
                      Loading suggested quotes...
                    </div>
                  )}

                  <div className="quotes-list">
                    {writer.quotes.map(quote => (
                      <div key={quote.id} className="quote-item">
                        <p>{quote.text}</p>
                        <button
                          onClick={() => removeQuote(writer.id, quote.id)}
                          className="remove-quote-button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="add-quote-form">
                    <input
                      type="text"
                      value={newQuote}
                      onChange={(e) => setNewQuote(e.target.value)}
                      placeholder="Add a quote..."
                      className="quote-input"
                    />
                    <button
                      onClick={() => addQuote(writer.id)}
                      className="add-quote-button"
                    >
                      Add Quote
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
