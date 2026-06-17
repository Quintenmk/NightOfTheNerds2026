console.log("PAGE LOADED", new Date().toISOString());

let selectedOption = null;
let quizStepIndex = 0;
let quizAnswers = {};
let quizSteps = [];
let isGenerating = false;
let pendingPrompt = "";
let partySize = 1;
let cameraStream = null;
let countdownTimer = null;
let countdownRemaining = 10;
const publicQrBaseUrl = window.APP_CONFIG?.publicQrBaseUrl || window.location.origin;

const quizConfig = {
  Action: {
    "Glass office building": [
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Sharp undercover suit", "Neon streetwear", "All-black assassin outfit", "Tactical techwear"]
      },
      {
        key: "weapon",
        question: "Which weapon will you bring?",
        options: ["Twin stun pistols", "Gadget briefcase", "Katana", "Energy rifle"]
      }
    ],
    "City streets": [
      {
        key: "movement",
        question: "How do you move around?",
        options: ["Flying with a storm hammer", "Swinging between buildings", "Riding a hoverboard", "Parkouring across rooftops"]
      },
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Leather jacket with sunglasses", "Hero suit with cape", "High-tech battle suit", "Masked vigilante suit"]
      },
      {
        key: "surroundings",
        question: "What's happening around you?",
        options: ["Exploding skyscrapers", "Rainy neon city", "Futuristic skyline", "Crowded chase scene"]
      }
    ],
    "Underground subway station": [
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Hoodie with face mask", "Ninja-style outfit", "Long coat with gloves", "Combat boots with utility belt"]
      },
      {
        key: "weapon",
        question: "Which weapon will you bring?",
        options: ["Shock gauntlets", "Quarterstaff", "Smoke bombs", "Retractable baton"]
      }
    ],
    Desert: [
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Desert raider gear", "White stunt-driver suit", "Armored nomad outfit", "Dusty leather jacket"]
      },
      {
        key: "weapon",
        question: "Which weapon will you bring?",
        options: ["Scimitar", "Energy whip", "Ancient blade", "Plasma revolver"]
      }
    ]
  },
  Horror: {
    Hospital: [
      {
        key: "enemy",
        question: "Who or what is after you?",
        options: ["Possessed surgeon", "Ghost patient", "Masked killer", "Haunted night nurse"]
      },
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Emergency scrubs", "Doctor coat", "Security uniform", "Blood-stained hoodie"]
      }
    ],
    "Empty town": [
      {
        key: "enemy",
        question: "Who or what is after you?",
        options: ["Shadow figure", "Werewolf", "Demon", "Cursed townsfolk"]
      },
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Torn denim jacket", "Muddy festival outfit", "Long black coat", "Survival outfit"]
      }
    ],
    Hotel: [
      {
        key: "enemy",
        question: "Who or what is after you?",
        options: ["Ghost guest", "Vampire", "Demon", "Haunted hotel manager"]
      },
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Luxury robe", "Hotel staff uniform", "Formal suit", "Vintage gala outfit"]
      }
    ],
    School: [
      {
        key: "enemy",
        question: "Who or what is after you?",
        options: ["Ghost student", "Possessed teacher", "Demon", "Shadow creature"]
      },
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Varsity jacket", "Hoodie with backpack", "Teacher outfit", "Janitor uniform"]
      }
    ]
  },
  Fantasy: {
    Castle: [
      {
        key: "race",
        question: "What kind of character are you?",
        options: ["Wizard", "Elf", "Knight", "Dragon rider"]
      },
      {
        key: "weapon",
        question: "Which weapon will you bring?",
        options: ["Runed sword", "Crystal staff", "Moonlit bow", "Enchanted dagger"]
      }
    ],
    "Magical forest": [
      {
        key: "race",
        question: "What kind of character are you?",
        options: ["Elf", "Forest mage", "Wizard", "Shape-shifting druid"]
      },
      {
        key: "weapon",
        question: "Which weapon will you bring?",
        options: ["Living vine bow", "Ancient staff", "Moonblade", "Magic spear"]
      }
    ],
    "Medieval village": [
      {
        key: "race",
        question: "What kind of character are you?",
        options: ["Rogue", "Wizard", "Elf", "Monster hunter"]
      },
      {
        key: "weapon",
        question: "Which weapon will you bring?",
        options: ["Flaming sword", "Bow", "Staff", "Crossbow"]
      }
    ],
    "Cloud village": [
      {
        key: "race",
        question: "What kind of character are you?",
        options: ["Sky guardian", "Cloud elf", "Storm wizard", "Airship captain"]
      },
      {
        key: "weapon",
        question: "Which weapon will you bring?",
        options: ["Storm staff", "Crystal ball", "Glowing sword", "Magic spear"]
      }
    ]
  },
  Adventure: {
    Temple: [
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Safari outfit", "Pathfinder outfit", "Explorer jacket", "Rugged adventure gear"]
      },
      {
        key: "treasure finder",
        question: "What helps you find treasure?",
        options: ["Golden compass", "Treasure map", "UV flashlight", "Ancient key"]
      }
    ],
    Island: [
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Retro diving suit", "Pirate outfit", "Tropical explorer outfit", "Storm-worn adventure clothes"]
      },
      {
        key: "treasure finder",
        question: "What helps you find treasure?",
        options: ["Treasure map", "Binoculars", "Golden compass", "Metal detector"]
      }
    ],
    Volcano: [
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Lava-proof explorer suit", "Rugged climbing gear", "Pathfinder outfit", "Survival gear"]
      },
      {
        key: "treasure finder",
        question: "What helps you find treasure?",
        options: ["UV flashlight", "Ancient stone tablet", "Golden compass", "Grappling rope"]
      }
    ],
    Jungle: [
      {
        key: "outfit",
        question: "What outfit are you wearing?",
        options: ["Safari outfit", "Jungle explorer gear", "Pathfinder outfit", "Expedition poncho"]
      },
      {
        key: "treasure finder",
        question: "What helps you find treasure?",
        options: ["Golden compass", "Binoculars", "Treasure map", "UV flashlight"]
      }
    ]
  }
};

const posterStyleGuides = {
  Action: {
    "Glass office building": "A glossy action-thriller poster with towering glass reflections, sharp diagonal composition, shattered windows, cold blue highlights, warm explosions in the background, and the main characters posed like elite agents at the center.",
    "City streets": "A blockbuster superhero chase poster with neon city lights, motion blur, sparks, smoke, dramatic low-angle camera perspective, and the main characters framed as larger-than-life heroes in the middle of chaos.",
    "Underground subway station": "A gritty urban action poster with tunnel lights, wet concrete, speeding subway motion, harsh shadows, smoke, and the main characters posed in a tense standoff composition.",
    Desert: "A sun-blasted action poster with huge dunes, dust clouds, orange backlight, vehicle-chase energy, heat haze, and the main characters standing boldly like legendary desert fighters."
  },
  Horror: {
    Hospital: "A chilling horror poster with sterile hospital corridors, flickering fluorescent light, green-blue shadows, unsettling empty space, and the main characters lit by a harsh beam as danger closes in behind them.",
    "Empty town": "A slow-burn horror poster with foggy streets, abandoned houses, dim streetlights, long shadows, and the main characters isolated in the foreground with a threatening silhouette in the distance.",
    Hotel: "A haunted hotel horror poster with vintage luxury, deep red shadows, glowing hallway lights, old wallpaper, eerie symmetry, and the main characters trapped in an elegant but dangerous setting.",
    School: "A teen horror poster with dark classrooms, lockers, torn posters, flashlight beams, eerie blue moonlight, and the main characters grouped together as something terrifying appears behind them."
  },
  Fantasy: {
    Castle: "An epic fantasy poster with a massive castle skyline, golden magical light, sweeping clouds, glowing weapons, heroic poses, and the main characters arranged like legendary champions.",
    "Magical forest": "An enchanted fantasy poster with luminous trees, floating magical particles, green and violet light, mysterious depth, glowing weapons, and the main characters framed as mythic forest heroes.",
    "Medieval village": "A classic quest fantasy poster with candlelit village streets, banners, mountains in the distance, warm firelight, magical atmosphere, and the main characters posed as adventurers beginning a great journey.",
    "Cloud village": "A sky-fantasy poster with floating islands, bright clouds, airships, silver-blue light, wind-swept costumes, and the main characters posed high above the world."
  },
  Adventure: {
    Temple: "A treasure-hunt adventure poster with ancient stone ruins, golden sunlight, traps, vines, dust, mysterious symbols, and the main characters discovering a legendary temple entrance.",
    Island: "A tropical adventure poster with turquoise water, storm clouds, pirate energy, palm silhouettes, hidden treasure atmosphere, and the main characters standing on the shore of a dangerous island.",
    Volcano: "A high-stakes adventure poster with glowing lava, ash clouds, cracked rock, orange-red lighting, dangerous cliffs, and the main characters racing against an erupting volcano.",
    Jungle: "A jungle expedition poster with dense green foliage, shafts of sunlight, ancient ruins, mist, hidden danger, and the main characters pushing through the wild toward treasure."
  }
};

const screenStart = document.getElementById("screenStart");
const screenCamera = document.getElementById("screenCamera");
const screenPhotoReview = document.getElementById("screenPhotoReview");
const screenWalkthrough = document.getElementById("screenWalkthrough");
const screenPartySize = document.getElementById("screenPartySize");
const screenQuiz = document.getElementById("screenQuiz");
const screenResult = document.getElementById("screenResult");

const buttonStart = document.getElementById("buttonStart");
const buttonWalkthroughNext = document.getElementById("buttonWalkthroughNext");
const buttonStartCountdown = document.getElementById("buttonStartCountdown");
const buttonCameraBack = document.getElementById("buttonCameraBack");
const videoLive = document.getElementById("videoLive");
const countdownBadge = document.getElementById("countdownBadge");
const countdownStatus = document.getElementById("countdownStatus");
const partySizeInput = document.getElementById("partySizeInput");
const buttonPartyMinus = document.getElementById("buttonPartyMinus");
const buttonPartyPlus = document.getElementById("buttonPartyPlus");
const buttonPartyBack = document.getElementById("buttonPartyBack");
const buttonPartyNext = document.getElementById("buttonPartyNext");
const mainPhotoPreview = document.getElementById("mainPhotoPreview");
const buttonApprovePhoto = document.getElementById("buttonApprovePhoto");
const buttonRetakePhoto = document.getElementById("buttonRetakePhoto");
const quizKicker = document.getElementById("quizKicker");
const quizQuestion = document.getElementById("quizQuestion");
const quizOptions = document.getElementById("quizOptions");
const btnQuizBack = document.getElementById("btnQuizBack");
const btnQuizNext = document.getElementById("btnQuizNext");

const statusText = document.getElementById("statusText");
const loadingSpinner = document.getElementById("loadingSpinner");
const aiLoadingOverlay = document.querySelector(".ai-loading-overlay");
const resultImage = document.getElementById("resultImage");
const actionButtons = document.getElementById("actionButtons");
const revealCanvas = document.getElementById("revealCanvas");
const qrCodeImage = document.getElementById("qrCodeImage");

function hideMainScreens() {
  [screenStart, screenCamera, screenPhotoReview, screenWalkthrough, screenPartySize, screenQuiz, screenResult].forEach((screen) => {
    screen.classList.add("hidden");
  });
}

function showWalkthrough() {
  hideMainScreens();
  screenWalkthrough.classList.remove("hidden");
}

async function showCameraScreen() {
  hideMainScreens();
  screenCamera.classList.remove("hidden");
  resetCountdown();
  await initCamera();
}

function clearPhotoState() {
  sessionStorage.removeItem("job_id");
}

async function initCamera() {
  if (cameraStream) {
    await videoLive.play().catch(() => {});
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 24, max: 30 },
        facingMode: "user"
      }
    });
    videoLive.srcObject = cameraStream;
    await videoLive.play();
  } catch (error) {
    console.error("Camera error:", error);
    countdownStatus.textContent = "Camera unavailable. Check browser permissions.";
    buttonStartCountdown.disabled = true;
  }
}

function resetCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  countdownRemaining = 10;
  countdownBadge.textContent = "10";
  countdownBadge.classList.add("hidden");
  countdownStatus.textContent = "Live preview ready";
  buttonStartCountdown.disabled = false;
  buttonCameraBack.disabled = false;
}

function stopCamera() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  videoLive.srcObject = null;
}

function startCountdown() {
  if (!cameraStream || countdownTimer) return;

  countdownRemaining = 10;
  countdownBadge.textContent = String(countdownRemaining);
  countdownBadge.classList.remove("hidden");
  countdownStatus.textContent = "Photo in 10 seconds";
  buttonStartCountdown.disabled = true;
  buttonCameraBack.disabled = true;

  countdownTimer = setInterval(() => {
    countdownRemaining--;

    if (countdownRemaining > 0) {
      countdownBadge.textContent = String(countdownRemaining);
      countdownStatus.textContent = `Photo in ${countdownRemaining} seconds`;
      return;
    }

    clearInterval(countdownTimer);
    countdownTimer = null;
    countdownBadge.textContent = "GO";
    countdownStatus.textContent = "Taking photo...";
    setTimeout(capturePhoto, 250);
  }, 1000);
}

function canvasToJpegBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.94);
  });
}

async function uploadCapturedPhoto(canvas) {
  const blob = await canvasToJpegBlob(canvas);
  if (!blob) throw new Error("Could not create photo file.");

  const formData = new FormData();
  formData.append("photo", blob, "camera-capture.jpg");

  const response = await fetch("/api/photo", {
    method: "POST",
    body: formData
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Photo upload failed: HTTP ${response.status}`);
  }

  return data;
}

async function capturePhoto() {
  if (!videoLive.videoWidth || !videoLive.videoHeight) {
    countdownStatus.textContent = "Camera is warming up...";
    buttonStartCountdown.disabled = false;
    setTimeout(startCountdown, 900);
    return;
  }

  const maxSize = 1920;
  const scale = Math.min(1, maxSize / Math.max(videoLive.videoWidth, videoLive.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(videoLive.videoWidth * scale);
  canvas.height = Math.round(videoLive.videoHeight * scale);
  canvas.getContext("2d").drawImage(videoLive, 0, 0, canvas.width, canvas.height);

  try {
    countdownStatus.textContent = "Saving photo...";
    const data = await uploadCapturedPhoto(canvas);
    sessionStorage.setItem("job_id", data.job_id);
    mainPhotoPreview.src = `${data.photo_url}?t=${Date.now()}`;
    stopCamera();
    hideMainScreens();
    screenPhotoReview.classList.remove("hidden");
  } catch (error) {
    console.error("Photo upload error:", error);
    countdownStatus.textContent = "Photo failed. Please try again.";
    countdownBadge.classList.add("hidden");
    buttonStartCountdown.disabled = false;
    buttonCameraBack.disabled = false;
  }
}

function clampPartySize(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(8, Math.max(1, parsed));
}

function updatePartySize(value) {
  partySize = clampPartySize(value);
  partySizeInput.value = String(partySize);
  sessionStorage.setItem("partySize", String(partySize));
}

function showPartySize() {
  hideMainScreens();
  updatePartySize(sessionStorage.getItem("partySize") || partySizeInput.value || 1);
  screenPartySize.classList.remove("hidden");
  partySizeInput.focus();
}

function renderQuizStep() {
  selectedOption = null;
  btnQuizNext.disabled = true;
  btnQuizBack.disabled = quizStepIndex === 0;

  const step = quizSteps[quizStepIndex];
  const total = quizSteps.length;
  if (step.key === "genre") {
    quizKicker.textContent = "Genre";
  } else if (step.key === "location") {
    quizKicker.textContent = "Location";
  } else {
    quizKicker.textContent = `Scene ${quizStepIndex - 1} of ${Math.max(1, total - 2)}`;
  }
  quizQuestion.textContent = step.question;
  quizOptions.innerHTML = "";

  step.options.forEach((option) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "optionContainer quiz-option";
    card.dataset.value = option;
    card.innerHTML = `<h3>${option}</h3>`;
    if (quizAnswers[step.key] === option) {
      card.classList.add("selected");
      selectedOption = option;
      btnQuizNext.disabled = false;
    }
    card.addEventListener("click", () => {
      document.querySelectorAll(".quiz-option").forEach((item) => {
        item.classList.remove("selected");
      });
      card.classList.add("selected");
      selectedOption = option;
      btnQuizNext.disabled = false;
    });
    quizOptions.appendChild(card);
  });
}

function startQuiz() {
  quizStepIndex = 0;
  quizAnswers = {};
  quizSteps = [
    {
      key: "genre",
      question: "Which genre movie do you want to be in?",
      options: Object.keys(quizConfig)
    }
  ];

  hideMainScreens();
  screenQuiz.classList.remove("hidden");
  renderQuizStep();
}

buttonStart.addEventListener("click", () => {
  stopCamera();
  clearPhotoState();
  sessionStorage.clear();
  pendingPrompt = "";
  showWalkthrough();
});

buttonWalkthroughNext.addEventListener("click", () => {
  showPartySize();
});

buttonStartCountdown.addEventListener("click", () => {
  startCountdown();
});

buttonCameraBack.addEventListener("click", () => {
  stopCamera();
  quizStepIndex = Math.max(0, quizSteps.length - 1);
  hideMainScreens();
  screenQuiz.classList.remove("hidden");
  renderQuizStep();
});

buttonPartyMinus.addEventListener("click", () => {
  updatePartySize(partySize - 1);
});

buttonPartyPlus.addEventListener("click", () => {
  updatePartySize(partySize + 1);
});

partySizeInput.addEventListener("input", () => {
  updatePartySize(partySizeInput.value);
});

buttonPartyBack.addEventListener("click", () => {
  showWalkthrough();
});

buttonPartyNext.addEventListener("click", () => {
  updatePartySize(partySizeInput.value);
  startQuiz();
});

buttonApprovePhoto.addEventListener("click", () => {
  if (!pendingPrompt || isGenerating) return;

  hideMainScreens();
  screenResult.classList.remove("hidden");
  submitToBackend(pendingPrompt);
});

buttonRetakePhoto.addEventListener("click", async () => {
  await cleanupCurrentJob();
  clearPhotoState();
  mainPhotoPreview.removeAttribute("src");
  showCameraScreen();
});

btnQuizBack.addEventListener("click", () => {
  if (quizStepIndex === 0) return;

  const currentStep = quizSteps[quizStepIndex];
  if (currentStep) {
    delete quizAnswers[currentStep.key];
    sessionStorage.removeItem(currentStep.key);
  }

  quizStepIndex--;

  if (quizStepIndex === 0) {
    quizAnswers = {};
    quizSteps = [quizSteps[0]];
  } else if (quizStepIndex === 1) {
    delete quizAnswers.location;
    sessionStorage.removeItem("location");
    quizSteps = [quizSteps[0], quizSteps[1]];
  }

  renderQuizStep();
});

btnQuizNext.addEventListener("click", () => {
  if (!selectedOption) return;

  const step = quizSteps[quizStepIndex];
  quizAnswers[step.key] = selectedOption;
  sessionStorage.setItem(step.key, selectedOption);

  if (step.key === "genre") {
    quizSteps = [
      quizSteps[0],
      {
        key: "location",
        question: `Where does your ${selectedOption} movie happen?`,
        options: Object.keys(quizConfig[selectedOption])
      }
    ];
  } else if (step.key === "location") {
    const genre = quizAnswers.genre;
    quizSteps = [quizSteps[0], quizSteps[1], ...quizConfig[genre][selectedOption]];
  }

  quizStepIndex++;

  if (quizStepIndex < quizSteps.length) {
    renderQuizStep();
    return;
  }

  pendingPrompt = generatePrompt(quizAnswers);
  sessionStorage.setItem("prompt", pendingPrompt);
  clearPhotoState();
  showCameraScreen();
});

function formatAnswerKey(key) {
  return key
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function generatePrompt(answers) {
  const peopleLine = partySize === 1
    ? "Preserve exactly one person from the reference photo as the main character."
    : `Preserve exactly ${partySize} people from the reference photo as the main characters.`;
  const posterStyle = posterStyleGuides[answers.genre]?.[answers.location] || "A polished theatrical film poster with dramatic lighting, clear character focus, strong atmosphere, and a bold fictional title.";
  const detailLines = Object.entries(answers)
    .filter(([key]) => !["genre", "location"].includes(key))
    .map(([key, value]) => `- ${formatAnswerKey(key)}: ${value}`)
    .join("\n");

  return `Create a wide 16:9 theatrical film poster, not a normal photo and not a simple scene still.

Scene brief:
- Genre: ${answers.genre}
- Location: ${answers.location}
- Party size: ${partySize}
${detailLines}

Branch-specific poster direction:
- ${posterStyle}

Reference photo instructions:
- Use the captured faces and bodies as identity references only.
- ${peopleLine}
- Keep faces recognizable, sharp, and naturally lit.

Film poster requirements:
- Make the people look like the main characters of this ${answers.genre} movie poster.
- Use a professional poster layout: strong central character pose, cinematic background, dramatic contrast, clear depth, theatrical lighting, and polished color grading.
- Include one large, bold, fictional movie title that fits the scene and genre.
- Place the title like a real film poster title, preferably near the bottom or top without covering faces.
- The final image must read instantly as a finished film poster for a movie premiere.
- Do not include real names, "starring", cast credits, actor names, logos, watermarks, warped faces, extra limbs, distorted hands, or low-resolution details.`;
}

function getContainRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height
  };
}

function startPixelReveal(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = revealCanvas;
      const ctx = canvas.getContext("2d");

      canvas.width = 1280;
      canvas.height = 720;
      const imageRect = getContainRect(img.width, img.height, canvas.width, canvas.height);

      revealCanvas.style.display = "block";
      resultImage.style.display = "none";
      actionButtons.style.display = "none";
      aiLoadingOverlay.style.display = "grid";

      const stages = [
        { pixelSize: 8, noise: 1.0, alpha: 0.0, blur: 18, duration: 650, text: "Starting from visual noise..." },
        { pixelSize: 12, noise: 0.85, alpha: 0.15, blur: 16, duration: 650, text: "AI is searching for shapes..." },
        { pixelSize: 20, noise: 0.65, alpha: 0.3, blur: 12, duration: 650, text: "A character is slowly appearing..." },
        { pixelSize: 36, noise: 0.45, alpha: 0.5, blur: 9, duration: 650, text: "Your movie world is becoming clearer..." },
        { pixelSize: 70, noise: 0.25, alpha: 0.7, blur: 5, duration: 650, text: "Adding final details..." },
        { pixelSize: 140, noise: 0.1, alpha: 0.9, blur: 2, duration: 650, text: "Almost ready..." },
        { pixelSize: 1280, noise: 0, alpha: 1, blur: 0, duration: 650, text: "Your character is ready!" }
      ];

      function drawNoiseLayer(noiseAmount) {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const purple = Math.random() * 180 + 50;
          const yellow = Math.random() * 180 + 40;
          const pink = Math.random() * 160 + 60;
          const blue = Math.random() * 140 + 80;
          const colorType = Math.random();

          if (colorType < 0.35) {
            data[i] = purple;
            data[i + 1] = 40;
            data[i + 2] = 220;
          } else if (colorType < 0.6) {
            data[i] = 255;
            data[i + 1] = yellow;
            data[i + 2] = 40;
          } else if (colorType < 0.82) {
            data[i] = 240;
            data[i + 1] = 60;
            data[i + 2] = pink;
          } else {
            data[i] = 50;
            data[i + 1] = blue;
            data[i + 2] = 255;
          }

          data[i + 3] = 255 * noiseAmount;
        }

        ctx.putImageData(imageData, 0, 0);
      }

      function drawPixelatedImage(stage) {
        const smallCanvas = document.createElement("canvas");
        const smallCtx = smallCanvas.getContext("2d");
        const ratio = img.height / img.width;
        smallCanvas.width = stage.pixelSize;
        smallCanvas.height = Math.max(1, Math.floor(stage.pixelSize * ratio));

        smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);

        ctx.save();
        ctx.globalAlpha = stage.alpha;
        ctx.imageSmoothingEnabled = false;
        ctx.filter = `blur(${stage.blur}px)`;
        ctx.drawImage(
          smallCanvas,
          0,
          0,
          smallCanvas.width,
          smallCanvas.height,
          imageRect.x,
          imageRect.y,
          imageRect.width,
          imageRect.height
        );
        ctx.restore();
        ctx.filter = "none";
        ctx.globalAlpha = 1;
      }

      let stageIndex = 0;

      function drawStage() {
        const stage = stages[stageIndex];
        statusText.innerText = stage.text;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawNoiseLayer(stage.noise);
        drawPixelatedImage(stage);
        stageIndex++;

        if (stageIndex < stages.length) {
          setTimeout(drawStage, stage.duration);
          return;
        }

        setTimeout(() => {
          revealCanvas.style.display = "none";
          resultImage.src = imageUrl;
          resultImage.style.display = "block";
          aiLoadingOverlay.style.display = "none";
          setQrCode(imageUrl);
          actionButtons.style.display = "flex";
          resolve();
        }, 450);
      }

      drawStage();
    };

    img.onerror = () => reject(new Error("Could not load generated image for reveal animation."));
    img.src = imageUrl;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGeneration(jobId) {
  const deadline = Date.now() + 180000;

  while (Date.now() < deadline) {
    const response = await fetch(`/api/status/${encodeURIComponent(jobId)}`);
    const data = await response.json().catch(() => ({}));

    if (data.status === "done" && data.image_url) {
      return data;
    }

    if (data.status === "error") {
      throw new Error(data.error || "Generation failed.");
    }

    await sleep(1500);
  }

  throw new Error("Generation took too long. Please try again.");
}

async function submitToBackend(prompt) {
  try {
    isGenerating = true;
    aiLoadingOverlay.style.display = "grid";
    statusText.innerText = "Generating your cinematic scene...";
    loadingSpinner.style.display = "block";
    resultImage.style.display = "none";
    actionButtons.style.display = "none";

    const jobId = sessionStorage.getItem("job_id");
    if (!jobId) {
      statusText.innerText = "Error: No photo job found. Please start over.";
      loadingSpinner.style.display = "none";
      aiLoadingOverlay.style.display = "grid";
      isGenerating = false;
      return;
    }

    const formData = new FormData();
    formData.append("job_id", jobId);
    formData.append("prompt", prompt);

    const apiResponse = await fetch("/api/submit", {
      method: "POST",
      body: formData
    });

    const data = await apiResponse.json().catch(() => ({}));
    console.log("Backend response:", data);

    if (!apiResponse.ok) {
      statusText.innerText = "Generation failed: " + (data.error || `HTTP ${apiResponse.status}`);
      loadingSpinner.style.display = "none";
      aiLoadingOverlay.style.display = "grid";
      isGenerating = false;
      return;
    }

    sessionStorage.setItem("job_id", data.job_id || jobId);
    statusText.innerText = "AI is creating your movie scene...";
    const finishedJob = await waitForGeneration(data.job_id || jobId);
    statusText.innerText = "Preparing your movie character...";
    loadingSpinner.style.display = "none";
    sessionStorage.setItem("image_url", finishedJob.image_url);
    await startPixelReveal(finishedJob.image_url);
  } catch (error) {
    console.error("Generation error:", error);
    statusText.innerText = "Failed to generate image: " + (error.message || error);
    loadingSpinner.style.display = "none";
    aiLoadingOverlay.style.display = "grid";
    revealCanvas.style.display = "none";
  } finally {
    isGenerating = false;
  }
}

function setQrCode(imageUrl) {
  const imagePath = new URL(imageUrl, window.location.href).pathname;
  const imageName = imagePath.split("/").pop();
  const absoluteUrl = new URL(`/view/${imageName}`, publicQrBaseUrl).href;
  qrCodeImage.src = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=14&data=" + encodeURIComponent(absoluteUrl);
}

async function cleanupCurrentJob() {
  const jobId = sessionStorage.getItem("job_id");
  if (!jobId) return;

  try {
    await fetch(`/api/job/${encodeURIComponent(jobId)}`, {
      method: "DELETE"
    });
  } catch (error) {
    console.warn("Could not delete temporary job files:", error);
  }
}

async function startOver() {
  await cleanupCurrentJob();
  stopCamera();

  sessionStorage.clear();
  clearPhotoState();

  selectedOption = null;
  quizStepIndex = 0;
  quizAnswers = {};
  quizSteps = [];
  pendingPrompt = "";
  partySize = 1;
  partySizeInput.value = "1";

  btnQuizNext.disabled = true;
  quizOptions.innerHTML = "";
  hideMainScreens();
  screenStart.classList.remove("hidden");

  revealCanvas.style.display = "none";
  resultImage.style.display = "none";
  qrCodeImage.removeAttribute("src");
  actionButtons.style.display = "none";
  loadingSpinner.style.display = "none";
  aiLoadingOverlay.style.display = "grid";
}
