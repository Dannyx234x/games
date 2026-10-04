(() => {
  const themes = [
    { word: "Nova", category: "Arcade", type: "dodge", art: "space", icon: "🚀", colors: ["#a980ff", "#71e8e5"], labels: ["Starfall", "Orbit Rush", "Comet Run", "Void Runner", "Moonshot"] },
    { word: "Pixel", category: "Puzzle", type: "memory", art: "puzzle", icon: "▦", colors: ["#ff7bbe", "#ffd17b"], labels: ["Match Lab", "Color Craze", "Flip Theory", "Mind Melt", "Pair Up"] },
    { word: "Neon", category: "Arcade", type: "snake", art: "cyber", icon: "〰", colors: ["#74e4a8", "#72e4e3"], labels: ["Snake City", "Grid Glide", "Byte Bite", "Circuit Trail", "Glow Worm"] },
    { word: "Turbo", category: "Action", type: "breakout", art: "racing", icon: "◒", colors: ["#ffbd72", "#ff71bd"], labels: ["Brick Breaker", "Paddle Panic", "Block Party", "Wall Bouncer", "Bounce Back"] },
    { word: "Lucky", category: "Casual", type: "memory", art: "casual", icon: "✿", colors: ["#c7ef7d", "#ffcf70"], labels: ["Garden Pairs", "Lucky Lanterns", "Dream Match", "Soft Focus", "Little Wonders"] }
  ];
  const games = [];
  for (let i = 0; i < 100; i++) {
    const theme = themes[Math.floor(i / 20)];
    const within = i % 20;
    const label = theme.labels[within % theme.labels.length];
    const suffix = Math.floor(within / theme.labels.length);
    games.push({
      id: `game-${String(i + 1).padStart(3, "0")}`,
      title: suffix === 0 ? `${theme.word}: ${label}` : `${theme.word}: ${label} ${["DX", "After Dark", "Remix"][suffix - 1]}`,
      category: theme.category,
      type: theme.type,
      art: theme.art,
      icon: theme.icon,
      colors: theme.colors,
      rating: (4.3 + ((i * 7) % 8) / 10).toFixed(1),
      plays: 2200 + ((i * 791) % 22700),
      number: i + 1
    });
  }
  window.PLAYFORM_GAMES = games;
})();
