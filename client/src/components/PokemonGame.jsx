import { useEffect, useRef, useState } from "react";

export default function PokemonGame({ csrfToken, startingScore }) {
  const canvasRef = useRef(null);
  const inputRef = useRef(null);

  const [pokemonNames, setPokemonNames] = useState([]);
  const [listVisible, setListVisible] = useState(false);
  const [listItems, setListItems] = useState([]);
  const [result, setResult] = useState("");
 const [score, setScore] = useState(startingScore);
  const [loadingPokemon, setLoadingPokemon] = useState(false);

  const [currentPokemon, setCurrentPokemon] = useState(null);
  const [gameReady, setGameReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [fullImage, setFullImage] = useState(null);

  const firstLoadRef = useRef(false);


  //list
  useEffect(() => {
    async function loadList() {
      try {
        const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=386");
        const data = await res.json();
        setPokemonNames(data.results.map((p) => p.name));
      } catch (err) {
        console.error(err);
        setResult("Error loading Pokémon list");
      }
    }
    loadList();
  }, []);

  function drawPixelated(img, pixelSize = 50) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const w = Math.max(1, Math.floor(canvas.width / pixelSize));
    const h = Math.max(1, Math.floor(canvas.height / pixelSize));

    const offCanvas = document.createElement("canvas");
    offCanvas.width = w;
    offCanvas.height = h;

    const offCtx = offCanvas.getContext("2d");
    offCtx.imageSmoothingEnabled = true;
    offCtx.drawImage(img, 0, 0, w, h);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offCanvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
  }

  function drawClear(img) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
  }

  async function newPokemon() {
    setGameReady(false);
    setLoadingPokemon(true);
    setServerReady(false);
    setImageLoaded(false);

    const id = Math.floor(Math.random() * 386) + 1;

    try {
      // API
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = await res.json();
      const name = data.name;

      setCurrentPokemon(name);

      const imgUrl =
        (data.sprites?.other?.["official-artwork"]?.front_default) ||
        data.sprites?.front_default ||
        null;

      if (!imgUrl) throw new Error("No image available");

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        setFullImage(img);
        drawPixelated(img, 12);
        setImageLoaded(true);
        setLoadingPokemon(false);
      };

      img.onerror = () => {
        setResult("Failed to load image");
      };

      img.src = imgUrl;

      const serverRes = await fetch("/api/game/start", {
        method: "POST",
        credentials: "include", 
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ name }),
      });

      if (!serverRes.ok) throw new Error("Server error");

     
      setServerReady(true);
    } catch (err) {
      console.error(err);
      setResult("Error loading Pokémon");
    }
  }

  useEffect(() => {
    if (imageLoaded && serverReady) setGameReady(true);
  }, [imageLoaded, serverReady]);

  async function submitGuess() {
    if (!gameReady) return;

    const guess = inputRef.current.value.toLowerCase().trim();
    if (!guess) return;

    try {
      const res = await fetch("/api/game/guess", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ guess }),
      });

      const data = await res.json();

      if (data.correct) {
        setResult("Correct! +10 points");
        drawClear(fullImage);
        setScore(data.points);
        inputRef.current.value = "";
      } else {
        setResult("Wrong! Try again");
        inputRef.current.value = "";
      }
      setTimeout(() => {
  newPokemon();
  setResult(""); 
  inputRef.current.value = "";
}, 800);
    } catch (err) {
      console.error(err);
      setResult("Server error");
    }
  }

  function handleInput(e) {
    const value = e.target.value.toLowerCase();
    if (!value) {
      setListVisible(false);
      return;
    }

    const matches = pokemonNames
      .filter((name) => name.startsWith(value))
      .slice(0, 8);

    setListItems(matches);
    setListVisible(matches.length > 0);
  }

  function chooseFromList(name) {
    inputRef.current.value = name;
    setListVisible(false);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (!inputRef.current) return;
      if (!inputRef.current.contains(e.target)) {
        setListVisible(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

useEffect(() => {
  if (!firstLoadRef.current && csrfToken) {
    firstLoadRef.current = true;
    if (startingScore != null) {
      setScore(startingScore);
    }
    newPokemon();
  }
}, [csrfToken, startingScore]);

  return (
  <div className="pg-game-wrapper">

    <div className="pg-canvas-box">
      <canvas
        ref={canvasRef}
        width={250}
        height={250}
        className="pg-canvas"
      />
    </div>

    <p className="pg-status-text">
      {loadingPokemon ? "Loading Pokémon..." : result}
    </p>

    <p className="pg-score">Score: {score}</p>

    <div className="pg-search-box-wrapper">
      <input
        className="pg-search-box"
        ref={inputRef}
        onInput={handleInput}
        placeholder="Guess Pokémon"
        autoComplete="off"
      />

      {listVisible && (
        <ul className="autocomplete">
          {listItems.map((name) => (
            <li key={name} onClick={() => chooseFromList(name)}>
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>

    <div className="pg-buttons-row">
      <button
        className="pg-btn-action"
        onClick={newPokemon}
        disabled={!gameReady}
      >
        New Pokémon
      </button>

      <button
        className="pg-btn-action"
        onClick={submitGuess}
        disabled={!gameReady}
      >
        Guess
      </button>
    </div>

  </div>
);

}

