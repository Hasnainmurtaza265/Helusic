
import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  // =========================
  // STATES
  // =========================

  const [searchQuery, setSearchQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  const audioRef = useRef(null);

  // =========================
  // GET SONG IMAGE
  // =========================

  const getSongImage = (song) => {
    return (
      song?.image?.[2]?.url ||
      song?.image?.[1]?.url ||
      song?.image?.[0]?.url ||
      ""
    );
  };

  // =========================
  // GET ARTIST NAME
  // =========================

  const getArtistName = (song) => {
    return (
      song?.artists?.primary
        ?.map((artist) => artist.name)
        .join(", ") || "Unknown Artist"
    );
  };

  // =========================
  // SEARCH SONGS
  // =========================

  const searchSongs = async (query = searchQuery) => {
    if (!query.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(
          query
        )}&page=0&limit=20`
      );

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      const result = await response.json();

      console.log("API RESULT:", result);

      if (result.success) {
        const results = result.data?.results || [];

        setSongs(results);

        if (results.length === 0) {
          setError("No songs found.");
        }
      } else {
        setSongs([]);
        setError("No songs found.");
      }
    } catch (err) {
      console.error("Search error:", err);

      setSongs([]);
      setError("Something went wrong while loading songs.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOAD SONGS WHEN WEBSITE OPENS
  // =========================

  useEffect(() => {
    searchSongs("a");
  }, []);

  // =========================
  // PLAY SONG
  // =========================

  const playSong = (song) => {
    try {
      setError("");

      console.log("Selected song:", song);

      const downloadLinks = song?.downloadUrl || [];

      if (
        !Array.isArray(downloadLinks) ||
        downloadLinks.length === 0
      ) {
        setError("Audio URL not found for this song.");
        return;
      }

      // Highest quality URL
      const lastLink =
        downloadLinks[downloadLinks.length - 1];

      const audioUrl =
        typeof lastLink === "string"
          ? lastLink
          : lastLink?.url;

      if (!audioUrl) {
        setError("Audio URL not found for this song.");
        return;
      }

      const selectedSong = {
        ...song,

        title: song.name,

        primaryArtists: getArtistName(song),

        imageUrl: getSongImage(song),

        audioUrl: audioUrl,

        downloadLinks: downloadLinks,
      };

      console.log("PLAYING:", selectedSong);

      setCurrentSong(selectedSong);

      setCurrentTime(0);
      setDuration(0);

      setIsPlaying(true);

      saveRecentlyPlayed(selectedSong);
    } catch (err) {
      console.error("Play error:", err);

      setError("Unable to play this song.");

      setIsPlaying(false);
    }
  };

  // =========================
  // RECENTLY PLAYED
  // =========================

  const saveRecentlyPlayed = (song) => {
    try {
      const stored =
        JSON.parse(
          localStorage.getItem("recentlyPlayed")
        ) || [];

      const filtered = stored.filter(
        (item) => item.id !== song.id
      );

      const updated = [song, ...filtered].slice(0, 10);

      localStorage.setItem(
        "recentlyPlayed",
        JSON.stringify(updated)
      );
    } catch (err) {
      console.error(
        "Recently played error:",
        err
      );
    }
  };

  // =========================
  // AUDIO EFFECT
  // =========================

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !currentSong?.audioUrl) {
      return;
    }

    audio.pause();

    audio.src = currentSong.audioUrl;

    audio.volume = volume;

    audio.load();

    const startAudio = async () => {
      try {
        await audio.play();

        setIsPlaying(true);

        setError("");
      } catch (err) {
        console.error(
          "Audio play error:",
          err
        );

        setIsPlaying(false);

        setError(
          "Audio play nahi ho saka. Dusra song try karo."
        );
      }
    };

    startAudio();
  }, [currentSong]);

  // =========================
  // VOLUME SYNC
  // =========================

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // =========================
  // PLAY / PAUSE
  // =========================

  const togglePlay = () => {
    const audio = audioRef.current;

    if (!audio || !currentSong) {
      return;
    }

    if (isPlaying) {
      audio.pause();

      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setError("");
        })
        .catch((err) => {
          console.error(
            "Resume error:",
            err
          );

          setIsPlaying(false);

          setError(
            "Unable to play audio."
          );
        });
    }
  };

  // =========================
  // AUDIO EVENTS
  // =========================

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;

    if (
      audio &&
      isFinite(audio.duration)
    ) {
      setDuration(audio.duration);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;

    if (audio) {
      setCurrentTime(
        audio.currentTime
      );
    }
  };

  const handleAudioError = () => {
    console.error(
      "Audio source error"
    );

    setIsPlaying(false);

    setError(
      "Audio load nahi ho saka. Please another song try karo."
    );
  };

  // =========================
  // PROGRESS BAR
  // =========================

  const handleProgressChange = (e) => {
    const value = Number(
      e.target.value
    );

    if (audioRef.current) {
      audioRef.current.currentTime =
        value;

      setCurrentTime(value);
    }
  };

  // =========================
  // VOLUME
  // =========================

  const handleVolumeChange = (e) => {
    const value = Number(
      e.target.value
    );

    setVolume(value);

    if (audioRef.current) {
      audioRef.current.volume =
        value;
    }
  };

  // =========================
  // FORMAT TIME
  // =========================

  const formatTime = (time) => {
    if (!time || isNaN(time)) {
      return "0:00";
    }

    const minutes = Math.floor(
      time / 60
    );

    const seconds = Math.floor(
      time % 60
    );

    return `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // =========================
  // NEXT SONG
  // =========================

  const nextSong = () => {
    if (
      !currentSong ||
      songs.length === 0
    ) {
      return;
    }

    const currentIndex =
      songs.findIndex(
        (song) =>
          song.id === currentSong.id
      );

    if (currentIndex === -1) {
      playSong(songs[0]);
      return;
    }

    const nextIndex =
      currentIndex ===
      songs.length - 1
        ? 0
        : currentIndex + 1;

    playSong(
      songs[nextIndex]
    );
  };

  // =========================
  // PREVIOUS SONG
  // =========================

  const previousSong = () => {
    if (
      !currentSong ||
      songs.length === 0
    ) {
      return;
    }

    const currentIndex =
      songs.findIndex(
        (song) =>
          song.id === currentSong.id
      );

    if (currentIndex === -1) {
      playSong(songs[0]);
      return;
    }

    const previousIndex =
      currentIndex <= 0
        ? songs.length - 1
        : currentIndex - 1;

    playSong(
      songs[previousIndex]
    );
  };

  // =========================
  // SEARCH ON ENTER
  // =========================

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      searchSongs();
    }
  };

  // =========================
  // UI
  // =========================

  return (
    <div className="app">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="sidebar">

        <h1>
          Desi<span>Tunes</span>
        </h1>

        <nav>

          <a
            href="#"
            className="nav-item active"
          >
            <i className="fa-solid fa-house"></i>
            <span>Home</span>
          </a>

          <a
            href="#"
            className="nav-item"
          >
            <i className="fa-solid fa-magnifying-glass"></i>
            <span>Search</span>
          </a>

          <a
            href="#"
            className="nav-item"
          >
            <i className="fa-solid fa-fire"></i>
            <span>Trending</span>
          </a>

          <a
            href="#"
            className="nav-item"
          >
            <i className="fa-solid fa-list"></i>
            <span>Playlists</span>
          </a>

          <a
            href="#"
            className="nav-item"
          >
            <i className="fa-regular fa-heart"></i>
            <span>Favorites</span>
          </a>

          <a
            href="#"
            className="nav-item"
          >
            <i className="fa-regular fa-clock"></i>
            <span>Recently Played</span>
          </a>

        </nav>

        <div className="playlist-title">
          <span>PLAYLISTS</span>

          <button>
            +
          </button>
        </div>

        <div className="playlist">

          <div className="playlist-icon">
            ♥
          </div>

          <div>
            <h4>
              My Favorites
            </h4>

            <p>
              128 songs
            </p>
          </div>

        </div>

        <div className="playlist">

          <div className="playlist-icon">
            ♫
          </div>

          <div>
            <h4>
              Chill Vibes
            </h4>

            <p>
              50 songs
            </p>
          </div>

        </div>

        <div className="playlist">

          <div className="playlist-icon">
            ⚡
          </div>

          <div>
            <h4>
              Workout Mix
            </h4>

            <p>
              30 songs
            </p>
          </div>

        </div>

      </aside>


      {/* =========================
          MAIN
      ========================= */}

      <main className="main">

        {/* TOPBAR */}

        <header className="topbar">

          <div className="search">

            <i className="fa-solid fa-magnifying-glass"></i>

            <input
              type="text"
              placeholder="Search songs, artists, albums..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
            />

            <button
              className="search-btn"
              onClick={() =>
                searchSongs()
              }
            >
              Search
            </button>

          </div>

          <div className="profile">

            <button>
              🌙
            </button>

            <div className="avatar">
              H
            </div>

            <span>
              Hasnain
            </span>

          </div>

        </header>


        {/* ERROR */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}


        {/* =========================
            HERO
        ========================= */}

        <section className="hero">

          <div className="hero-content">

            <p>
              NOW PLAYING
            </p>

            <h2>
              {currentSong
                ? currentSong.title
                : "Select a song"}
            </h2>

            <h3>
              {currentSong
                ? currentSong.primaryArtists
                : "Choose a song to start playing"}
            </h3>

            <button
              className="play-btn"
              onClick={
                currentSong
                  ? togglePlay
                  : undefined
              }
            >
              {isPlaying
                ? "Ⅱ"
                : "▶"}
            </button>

          </div>

          <div className="hero-image">

            <img
              src={
                currentSong?.imageUrl ||
                "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80"
              }
              alt="Music"
            />

          </div>

        </section>


        {/* =========================
            SONGS
        ========================= */}

        <section className="section">

          <div className="section-header">

            <h2>
              {searchQuery
                ? `Results for "${searchQuery}"`
                : "Songs"}
            </h2>

            <span>
              See All →
            </span>

          </div>


          <div className="songs">

            {loading ? (

              <div className="loading">
                Loading songs...
              </div>

            ) : songs.length > 0 ? (

              songs.map((song) => {

                const image =
                  getSongImage(song);

                const artist =
                  getArtistName(song);

                return (
                  <div
                    className="song-card"
                    key={song.id}
                  >

                    <div className="song-img">

                      <img
                        src={image}
                        alt={song.name}
                      />

                      <button
                        onClick={() =>
                          playSong(song)
                        }
                      >
                        ▶
                      </button>

                    </div>

                    <h3>
                      {song.name}
                    </h3>

                    <p>
                      {artist}
                    </p>

                  </div>
                );

              })

            ) : (

              <div className="no-songs">
                No songs found.
              </div>

            )}

          </div>

        </section>

      </main>


      {/* =========================
          AUDIO
      ========================= */}

      <audio
        ref={audioRef}
        onLoadedMetadata={
          handleLoadedMetadata
        }
        onTimeUpdate={
          handleTimeUpdate
        }
        onEnded={nextSong}
        onError={
          handleAudioError
        }
      />


      {/* =========================
          BOTTOM PLAYER
      ========================= */}

      <div className="player">

        <div className="current-song">

          <div
            className="mini-img"
            style={{
              backgroundImage: `url(${
                currentSong?.imageUrl ||
                ""
              })`,
            }}
          ></div>

          <div>

            <h4>
              {currentSong?.title ||
                "No song selected"}
            </h4>

            <p>
              {currentSong?.primaryArtists ||
                "Select a song"}
            </p>

          </div>

        </div>


        <div className="controls">

          <div className="control-buttons">

            <button
              onClick={
                previousSong
              }
            >
              ⏮
            </button>

            <button
              className="main-play"
              onClick={
                currentSong
                  ? togglePlay
                  : undefined
              }
            >
              {isPlaying
                ? "Ⅱ"
                : "▶"}
            </button>

            <button
              onClick={
                nextSong
              }
            >
              ⏭
            </button>

          </div>


          <div className="progress">

            <span>
              {formatTime(
                currentTime
              )}
            </span>

            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={
                handleProgressChange
              }
            />

            <span>
              {formatTime(
                duration
              )}
            </span>

          </div>

        </div>


        <div className="volume">

          <span>
            {volume === 0
              ? "🔇"
              : "🔊"}
          </span>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={
              handleVolumeChange
            }
          />

        </div>

      </div>

    </div>
  );
}

export default App;