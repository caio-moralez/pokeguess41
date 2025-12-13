import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/authcontext";

export default function PokemonGame({ startingScore }) {
  const { accessToken } = useAuth(); // acess token fron auth context

  // refs for canvas and input elements
  const canvasRef = useRef(null);
  const inputRef = useRef(null);

  // State Variables
  const [pokemonNames, setPokemonNames] = useState([]); // all pokemon names for autocomplete 
  const [listVisible, setListVisible] = useState(false); // show/hide autocomplete
  const [listItems, setListItems] = useState([]); // filtered autocomplete itens
  const [result, setResult] = useState(""); // status message for guesses/loading
  const [score, setScore] = useState(startingScore); // player score
  const [loadingPokemon, setLoadingPokemon] = useState(false); // loading indicator for pokemon 
  const [currentPokemon, setCurrentPokemon] = useState(null); // display pokemon name
  const [gameReady, setGameReady] = useState(false); // indicate if game can accept guesses
  const [imageLoaded, setImageLoaded] = useState(false); // flag when pokemon image is loaded
  const [serverReady, setServerReady] = useState(false); // flag when backend has stored pokemon 
  const [fullImage, setFullImage] = useState(null); // full resolution image of pokemon 

  const firstLoadRef = useRef(false); // make sure new pokemon is loaded only after auth

  // load pokemon list of all pokemon names 
  useEffect(() => {
    async function loadList() {
      try {
        const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=386");
        const data = await res.json();
        // store only the names for autocomplete
        setPokemonNames(data.results.map((p) => p.name));
      } catch (err) {
        console.error(err);
        setResult("Error loading Pokémon list");
      }
    }
    loadList();
  }, []);

  // draw a pixelated version of the image
  function drawPixelated(img, pixelSize = 50) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    //calculate width and height in pixels
    const w = Math.max(1, Math.floor(canvas.width / pixelSize));
    const h = Math.max(1, Math.floor(canvas.height / pixelSize));

    // draw to offscreen to reduce resolution 
    const offCanvas = document.createElement("canvas");
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext("2d");
    offCtx.imageSmoothingEnabled = true;
    offCtx.drawImage(img, 0, 0, w, h);

    // draw the pixelated image back to canvas
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offCanvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
  }

  // draw full clear image
  function drawClear(img) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
  }

  // start a new Round
  async function newPokemon() {
    setGameReady(false);
    setLoadingPokemon(true);
    setServerReady(false);
    setImageLoaded(false);

    const id = Math.floor(Math.random() * 386) + 1;

    try {
      // fetch pokemon data from backend -- cached via Redis
      const res = await fetch(`/api/pokemon/${id}`);
      const data = await res.json();
      const name = data.name;
      setCurrentPokemon(name);

      // use official artwork 
      const imgUrl = data.image || null;
      if (!imgUrl) throw new Error("No image available");

      // Load img object
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

      // send to backend that the game round has started
      const serverRes = await fetch("/api/game/start", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!serverRes.ok) throw new Error("Server error");
      setServerReady(true);
    } catch (err) {
      console.error(err);
      setResult("Error loading Pokémon");
      setLoadingPokemon(false);
    }
  }
 
  // Enable game when both image and server are ready 
  useEffect(() => {
    if (imageLoaded && serverReady) setGameReady(true);
  }, [imageLoaded, serverReady]);

  // submit guess to backend
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
          "Authorization": `Bearer ${accessToken}`,
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

     // Auto load new pokemon after delay 800 ms
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

  // Autocomplete input handler
  function handleInput(e) {
    const value = e.target.value.toLowerCase();
    if (!value) {
      setListVisible(false);
      return;
    }
 // filter pokemon names for autocomplete -- max 8
    const matches = pokemonNames
      .filter((name) => name.startsWith(value))
      .slice(0, 8);

    setListItems(matches);
    setListVisible(matches.length > 0);
  }

  // Select pokemon from autocomplete list 
  function chooseFromList(name) {
    inputRef.current.value = name;
    setListVisible(false);
  }

  // Hide autocomplete when clicking outside
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

  // load first pokemon after user is authenticated
  useEffect(() => {
    if (!firstLoadRef.current && accessToken) {
      firstLoadRef.current = true;
      if (startingScore != null) setScore(startingScore);
      newPokemon();
    }
  }, [accessToken, startingScore]);

  return (
    <div className="pg-game-wrapper">
      <div className="pg-canvas-box">
        <canvas ref={canvasRef} width={250} height={250} className="pg-canvas" />
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
        <button className="pg-btn-action" onClick={newPokemon} disabled={!gameReady}>
          New Pokémon
        </button>

        <button className="pg-btn-action" onClick={submitGuess} disabled={!gameReady}>
          Guess
        </button>
      </div>
    </div>
  );
}

