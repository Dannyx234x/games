(() => {
  const games = window.PLAYFORM_GAMES || [];
  const grid = document.querySelector("#games-grid");
  const filters = document.querySelector("#category-filters");
  const search = document.querySelector("#search-input");
  const sort = document.querySelector("#sort-select");
  const emptyState = document.querySelector("#empty-state");
  const loadMore = document.querySelector("#load-more");
  const overlay = document.querySelector("#game-overlay");
  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d");
  const message = document.querySelector("#game-message");
  const toast = document.querySelector("#toast");
  const ctxW = canvas.width;
  const ctxH = canvas.height;
  const pageSize = 12;
  const categories = ["All games", "Arcade", "Puzzle", "Action", "Casual", "Favorites"];
  let activeCategory = "All games";
  let shown = pageSize;
  let currentGame = null;
  let frame = 0;
  let animation = 0;
  let lastTime = 0;
  let paused = false;
  let running = false;
  let score = 0;
  let keys = new Set();
  let gameState = {};
  let toastTimer = 0;

  const getStored = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (error) {
      console.warn(`Could not read saved ${key}.`, error);
      return fallback;
    }
  };
  const save = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Could not save ${key}.`, error);
    }
  };
  let favorites = getStored("playform-favorites", []);
  let highscores = getStored("playform-highscores", {});

  function updateFavoriteCount() {
    const count = favorites.length;
    document.querySelector("#favorite-count").textContent = count;
    document.querySelector("#stat-favorites").textContent = count;
  }
  function categoriesMarkup() {
    filters.innerHTML = categories.map((category, index) =>
      `<button class="filter-chip${index === 0 ? " active" : ""}" data-category="${category}" aria-pressed="${index === 0}">${category}</button>`
    ).join("");
  }
  function filteredGames() {
    const query = search.value.trim().toLowerCase();
    let results = games.filter(game => {
      const categoryMatch = activeCategory === "All games" ||
        (activeCategory === "Favorites" ? favorites.includes(game.id) : game.category === activeCategory);
      return categoryMatch && (!query || `${game.title} ${game.category}`.toLowerCase().includes(query));
    });
    if (sort.value === "az") results.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort.value === "newest") results.sort((a, b) => b.number - a.number);
    else results.sort((a, b) => b.plays - a.plays);
    return results;
  }
  function render() {
    const results = filteredGames();
    const shownResults = results.slice(0, shown);
    grid.innerHTML = shownResults.map((game, index) => {
      const favorite = favorites.includes(game.id);
      return `<article class="game-card">
        <div class="game-art art-${game.art}" style="--glow:${game.colors[0]}">
          ${index < 2 && activeCategory === "All games" ? '<span class="art-streak">TRENDING</span>' : ""}
          <button class="favorite-toggle${favorite ? " is-favorite" : ""}" data-favorite="${game.id}" aria-label="${favorite ? "Remove from" : "Add to"} favorites" aria-pressed="${favorite}">${favorite ? "♥" : "♡"}</button>
          <span class="art-icon">${game.icon}</span>
          <button class="card-play" data-play="${game.id}">▶ &nbsp; Play now</button>
        </div>
        <div class="game-card-body"><div class="game-card-top"><h3 title="${game.title}">${game.title}</h3><span class="card-category">${game.category}</span></div>
        <div class="card-meta"><span class="card-rating">★ ${game.rating}<span>· ${formatPlays(game.plays)} plays</span></span><span>↗</span></div></div>
      </article>`;
    }).join("");
    emptyState.hidden = results.length > 0;
    loadMore.hidden = shownResults.length >= results.length || results.length === 0;
    document.querySelector("#heading-count").textContent = results.length;
    document.querySelector("#shown-count").textContent = results.length ? `${shownResults.length} of ${results.length}` : "";
    document.querySelector("#total-count").textContent = games.length;
    updateFavoriteCount();
  }
  function formatPlays(plays) { return `${(plays / 1000).toFixed(1)}k`; }
  function selectCategory(category) {
    activeCategory = category;
    shown = pageSize;
    filters.querySelectorAll("button").forEach(button => {
      const active = button.dataset.category === category;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    render();
  }
  categoriesMarkup();
  render();

  filters.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (button) selectCategory(button.dataset.category);
  });
  document.querySelectorAll("[data-filter-link]").forEach(link => link.addEventListener("click", () => selectCategory("Favorites")));
  search.addEventListener("input", () => { shown = pageSize; render(); });
  sort.addEventListener("change", render);
  loadMore.addEventListener("click", () => { shown += pageSize; render(); });
  grid.addEventListener("click", event => {
    const favoriteButton = event.target.closest("[data-favorite]");
    if (favoriteButton) {
      const id = favoriteButton.dataset.favorite;
      favorites = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
      save("playform-favorites", favorites);
      render();
      return;
    }
    const playButton = event.target.closest("[data-play]");
    const card = event.target.closest(".game-card");
    if (playButton || card) openGame(games.find(game => game.id === (playButton || card).dataset.play || game.id === card?.querySelector("[data-play]")?.dataset.play));
  });
  document.querySelector("#random-game").addEventListener("click", () => openGame(games[Math.floor(Math.random() * games.length)]));
  document.querySelector("#close-game").addEventListener("click", closeGame);
  document.querySelector("#start-game").addEventListener("click", startGame);
  document.querySelector("#restart-game").addEventListener("click", () => { startGame(); });
  document.querySelector("#pause-game").addEventListener("click", togglePause);
  overlay.addEventListener("click", event => { if (event.target === overlay) closeGame(); });
  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      search.focus();
    }
    if (event.key === "Escape" && overlay.classList.contains("open")) closeGame();
    if (event.key === " " && overlay.classList.contains("open") && !running) {
      event.preventDefault();
      startGame();
    }
    if (event.key === " " && running) {
      event.preventDefault();
      togglePause();
    }
    keys.add(event.key.toLowerCase());
  });
  document.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));

  function openGame(game) {
    if (!game) return;
    currentGame = game;
    document.querySelector("#game-title").textContent = game.title;
    document.querySelector("#game-category").textContent = game.category.toUpperCase();
    document.querySelector("#game-high-score").textContent = highscores[game.id] || 0;
    document.querySelector("#game-score").textContent = "0";
    document.querySelector("#game-instructions").textContent = instructionFor(game.type);
    message.querySelector("h3").textContent = "Ready when you are";
    message.querySelector("p").textContent = instructionFor(game.type);
    message.querySelector(".start-button").innerHTML = 'Let’s play <span>→</span>';
    message.hidden = false;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    paused = false;
    running = false;
    drawBackdrop(game);
  }
  function closeGame() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    cancelAnimationFrame(animation);
    running = false;
    paused = false;
    keys.clear();
  }
  function startGame() {
    if (!currentGame) return;
    cancelAnimationFrame(animation);
    message.hidden = true;
    running = true;
    paused = false;
    score = 0;
    lastTime = 0;
    frame = 0;
    gameState = initialize(currentGame.type);
    document.querySelector("#game-score").textContent = "0";
    animation = requestAnimationFrame(tick);
  }
  function togglePause() {
    if (!running) return;
    paused = !paused;
    document.querySelector("#pause-game").textContent = paused ? "▶" : "Ⅱ";
    if (!paused) {
      lastTime = 0;
      animation = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animation);
      showMessage("Paused", "Take a breather. Your game is right where you left it.", "Keep going");
    }
  }
  function showMessage(title, description, buttonText) {
    message.querySelector("h3").textContent = title;
    message.querySelector("p").textContent = description;
    message.querySelector(".start-button").innerHTML = `${buttonText} <span>→</span>`;
    message.hidden = false;
  }
  function instructionFor(type) {
    return ({ snake: "Arrow keys or WASD to steer · Eat the glowing dots", breakout: "Move with ← → or A / D · Space to launch", dodge: "Arrow keys or WASD to move · Avoid the falling stars", memory: "Click two tiles to find a matching pair" })[type];
  }
  function initialize(type) {
    if (type === "snake") return { snake: [{ x: 12, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 10 }], direction: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: { x: 18, y: 8 }, step: 0 };
    if (type === "breakout") return { paddle: { x: ctxW / 2, y: ctxH - 36, w: 135, h: 13 }, ball: { x: ctxW / 2, y: ctxH - 54, vx: 4, vy: -5, r: 8, attached: true }, bricks: Array.from({ length: 32 }, (_, i) => ({ x: 95 + (i % 8) * 97, y: 80 + Math.floor(i / 8) * 30, alive: true, color: ["#a881ff", "#65dbd9", "#ff78bd", "#ffbf72"][Math.floor(i / 8)] })) };
    if (type === "memory") {
      const cards = Array.from({ length: 8 }, (_, i) => i % 4).sort(() => Math.random() - .5);
      return { cards: cards.map(value => ({ value, open: false, matched: false })), selected: [], lock: 0, moves: 0 };
    }
    return { player: { x: ctxW / 2, y: ctxH - 70, r: 13 }, hazards: [], spawn: 0, invulnerable: 0 };
  }
  function tick(time) {
    if (!running || paused) return;
    const delta = Math.min((time - (lastTime || time)) / 16.67, 2.2);
    lastTime = time;
    frame++;
    if (currentGame.type === "snake") updateSnake();
    else if (currentGame.type === "breakout") updateBreakout(delta);
    else if (currentGame.type === "dodge") updateDodge(delta);
    renderGame();
    animation = requestAnimationFrame(tick);
  }
  function endGame(win = false) {
    running = false;
    cancelAnimationFrame(animation);
    const finalScore = Math.floor(score);
    const previous = highscores[currentGame.id] || 0;
    if (finalScore > previous) {
      highscores[currentGame.id] = finalScore;
      save("playform-highscores", highscores);
      document.querySelector("#game-high-score").textContent = finalScore;
      showToast("New personal best!");
    }
    showMessage(win ? "Beautifully done!" : "Game over", win ? `You cleared it with ${finalScore} points.` : `You scored ${finalScore} points. Ready for another go?`, "Play again");
  }
  function setScore(value) {
    score = value;
    document.querySelector("#game-score").textContent = Math.floor(score);
  }

  function drawBackdrop(game) {
    ctx.clearRect(0, 0, ctxW, ctxH);
    ctx.fillStyle = "#090d17";
    ctx.fillRect(0, 0, ctxW, ctxH);
    ctx.strokeStyle = "#ffffff08";
    ctx.lineWidth = 1;
    for (let x = 0; x < ctxW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ctxH); ctx.stroke(); }
    for (let y = 0; y < ctxH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ctxW, y); ctx.stroke(); }
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(210,210,255,${((i * 17) % 7) / 22 + .08})`;
      ctx.fillRect((i * 137) % ctxW, (i * 79) % ctxH, 2, 2);
    }
    const gradient = ctx.createRadialGradient(ctxW / 2, ctxH / 2, 20, ctxW / 2, ctxH / 2, ctxW * .6);
    gradient.addColorStop(0, `${game.colors[0]}13`);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctxW, ctxH);
  }
  function renderGame() {
    drawBackdrop(currentGame);
    if (currentGame.type === "snake") drawSnake();
    else if (currentGame.type === "breakout") drawBreakout();
    else if (currentGame.type === "dodge") drawDodge();
  }
  function glowCircle(x, y, radius, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function roundedRect(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }
  function updateSnake() {
    const direction = gameState.next;
    if (direction.x !== -gameState.direction.x || direction.y !== -gameState.direction.y) gameState.direction = direction;
    if (frame % 8 !== 0) return;
    const head = { x: gameState.snake[0].x + gameState.direction.x, y: gameState.snake[0].y + gameState.direction.y };
    if (head.x < 0 || head.x >= 24 || head.y < 0 || head.y >= 13 || gameState.snake.some(part => part.x === head.x && part.y === head.y)) return endGame();
    gameState.snake.unshift(head);
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
      setScore(score + 10);
      gameState.food = { x: Math.floor(Math.random() * 22) + 1, y: Math.floor(Math.random() * 11) + 1 };
    } else gameState.snake.pop();
  }
  function drawSnake() {
    const cell = 34;
    gameState.snake.forEach((part, index) => {
      ctx.save();
      ctx.shadowColor = "#59edb5";
      ctx.shadowBlur = index === 0 ? 18 : 8;
      roundedRect(72 + part.x * cell, 49 + part.y * cell, cell - 5, cell - 5, 7, index === 0 ? "#b5ffb1" : `hsl(${152 - index * 1.4},78%,${56 - Math.min(index, 18)}%)`);
      ctx.restore();
    });
    glowCircle(72 + gameState.food.x * cell + 14, 49 + gameState.food.y * cell + 14, 7, "#ff73bd");
  }
  function updateBreakout(delta) {
    const paddle = gameState.paddle;
    if (keys.has("arrowleft") || keys.has("a")) paddle.x -= 8 * delta;
    if (keys.has("arrowright") || keys.has("d")) paddle.x += 8 * delta;
    paddle.x = Math.max(paddle.w / 2 + 25, Math.min(ctxW - paddle.w / 2 - 25, paddle.x));
    const ball = gameState.ball;
    if (ball.attached) {
      ball.x = paddle.x;
      if (keys.has(" ") || keys.has("arrowup") || keys.has("w")) ball.attached = false;
      return;
    }
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;
    if (ball.x < 25 || ball.x > ctxW - 25) ball.vx *= -1;
    if (ball.y < 25) ball.vy *= -1;
    if (ball.y + ball.r > paddle.y && ball.x > paddle.x - paddle.w / 2 && ball.x < paddle.x + paddle.w / 2 && ball.vy > 0) {
      ball.vy = -Math.abs(ball.vy);
      ball.vx = ((ball.x - paddle.x) / (paddle.w / 2)) * 6;
    }
    for (const brick of gameState.bricks) {
      if (!brick.alive) continue;
      if (ball.x > brick.x && ball.x < brick.x + 80 && ball.y - ball.r < brick.y + 19 && ball.y + ball.r > brick.y) {
        brick.alive = false;
        ball.vy *= -1;
        setScore(score + 10);
        break;
      }
    }
    if (gameState.bricks.every(brick => !brick.alive)) return endGame(true);
    if (ball.y > ctxH + 5) {
      ball.attached = true;
      ball.y = paddle.y - 18;
      ball.vy = -5;
      gameState.lives = (gameState.lives ?? 3) - 1;
      if (gameState.lives <= 0) endGame();
    }
  }
  function drawBreakout() {
    gameState.bricks.forEach(brick => {
      if (!brick.alive) return;
      ctx.save(); ctx.shadowColor = brick.color; ctx.shadowBlur = 12;
      roundedRect(brick.x, brick.y, 80, 19, 4, brick.color); ctx.restore();
    });
    const paddle = gameState.paddle;
    ctx.save(); ctx.shadowColor = "#77e5ff"; ctx.shadowBlur = 18;
    roundedRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, 7, "#9bebf4"); ctx.restore();
    glowCircle(gameState.ball.x, gameState.ball.y, gameState.ball.r, "#fff");
    ctx.fillStyle = "#a2a3b1"; ctx.font = "12px 'DM Mono', monospace";
    ctx.fillText(`LIVES  ${"♥ ".repeat(gameState.lives ?? 3)}`, 25, 30);
  }
  function updateDodge(delta) {
    const player = gameState.player;
    const speed = 5.5 * delta;
    if (keys.has("arrowleft") || keys.has("a")) player.x -= speed;
    if (keys.has("arrowright") || keys.has("d")) player.x += speed;
    if (keys.has("arrowup") || keys.has("w")) player.y -= speed;
    if (keys.has("arrowdown") || keys.has("s")) player.y += speed;
    player.x = Math.max(20, Math.min(ctxW - 20, player.x));
    player.y = Math.max(30, Math.min(ctxH - 20, player.y));
    gameState.spawn += delta;
    if (gameState.spawn > 24) {
      gameState.spawn = 0;
      gameState.hazards.push({ x: 25 + Math.random() * (ctxW - 50), y: -15, r: 6 + Math.random() * 8, speed: 2.5 + Math.random() * 2.8 });
    }
    for (const hazard of gameState.hazards) {
      hazard.y += hazard.speed * delta;
      if (Math.hypot(player.x - hazard.x, player.y - hazard.y) < player.r + hazard.r) return endGame();
    }
    gameState.hazards = gameState.hazards.filter(hazard => hazard.y < ctxH + 20);
    setScore(score + delta * .11);
  }
  function drawDodge() {
    gameState.hazards.forEach(hazard => glowCircle(hazard.x, hazard.y, hazard.r, "#ff6fbd"));
    const player = gameState.player;
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(-Math.PI / 2);
    ctx.shadowColor = "#7ae9ed"; ctx.shadowBlur = 20;
    ctx.fillStyle = "#c4ffff"; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-12, -11); ctx.lineTo(-7, 0); ctx.lineTo(-12, 11); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  canvas.addEventListener("click", event => {
    if (!running || !currentGame || currentGame.type !== "memory" || gameState.lock) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * (ctxW / bounds.width);
    const y = (event.clientY - bounds.top) * (ctxH / bounds.height);
    const col = Math.floor((x - 245) / 120);
    const row = Math.floor((y - 97) / 130);
    const index = row * 4 + col;
    if (x < 245 || x > 725 || y < 97 || y > 357 || index < 0 || index > 7) return;
    const card = gameState.cards[index];
    if (!card || card.open || card.matched) return;
    card.open = true;
    gameState.selected.push(index);
    if (gameState.selected.length === 2) {
      gameState.moves++;
      const [first, second] = gameState.selected.map(i => gameState.cards[i]);
      if (first.value === second.value) {
        first.matched = second.matched = true;
        gameState.selected = [];
        setScore(score + 100);
        if (gameState.cards.every(item => item.matched)) endGame(true);
      } else {
        gameState.lock = window.setTimeout(() => {
          first.open = second.open = false;
          gameState.selected = [];
          gameState.lock = 0;
          renderGame();
        }, 750);
      }
    }
    renderGame();
  });
  function drawMemory() {
    const symbols = ["✦", "☾", "◈", "✿"];
    gameState.cards.forEach((card, index) => {
      const x = 252 + (index % 4) * 116;
      const y = 105 + Math.floor(index / 4) * 128;
      const visible = card.open || card.matched;
      ctx.save();
      ctx.shadowColor = visible ? currentGame.colors[0] : "#000";
      ctx.shadowBlur = visible ? 15 : 0;
      roundedRect(x, y, 94, 104, 10, visible ? (card.matched ? "#242a34" : "#27213d") : "#191e2c");
      ctx.strokeStyle = visible ? currentGame.colors[0] : "#31374a";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, y, 94, 104, 10); ctx.stroke();
      ctx.fillStyle = visible ? (card.matched ? "#66717c" : "#f0ddff") : "#777f9a";
      ctx.font = visible ? "38px 'DM Sans', sans-serif" : "31px 'DM Sans', sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(visible ? symbols[card.value] : "✧", x + 47, y + 52);
      ctx.restore();
    });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#a9acba"; ctx.font = "12px 'DM Mono', monospace";
    ctx.fillText(`MOVES  ${gameState.moves}`, 25, 30);
  }
  const originalRenderGame = renderGame;
  renderGame = function () {
    drawBackdrop(currentGame);
    if (currentGame.type === "snake") drawSnake();
    else if (currentGame.type === "breakout") drawBreakout();
    else if (currentGame.type === "dodge") drawDodge();
    else if (currentGame.type === "memory") drawMemory();
  };
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2200);
  }
  canvas.addEventListener("mousemove", event => {
    if (!running || currentGame?.type !== "breakout") return;
    const bounds = canvas.getBoundingClientRect();
    gameState.paddle.x = Math.max(90, Math.min(ctxW - 90, (event.clientX - bounds.left) * ctxW / bounds.width));
  });
})();
