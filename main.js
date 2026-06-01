console.log("PAGE LOADED", new Date().toISOString());
 
  // STATE
  let chosenWeapon = "";
  let chosenTheme = "";
  let chosenOutfit = "";
  let chosenSidekick = "";
  let isGenerating = false;
 
  // ELEMENTS
  const video = document.getElementById('videoLive');
  const screenCamera = document.getElementById('screenCamera');
  const screenConfirm = document.getElementById('screenConfirm');
  const screenWeapon = document.getElementById('screenWeapon');
  const screenTheme = document.getElementById('screenTheme');
  const screenOutfit = document.getElementById('screenOutfit');
  const screenSidekick = document.getElementById('screenSidekick');
  const screenResult = document.getElementById('screenResult');
 
  const photoPreview = document.getElementById('photoPreview');
  const buttonTake = document.getElementById('buttonTake');
  const buttonYes = document.getElementById('buttonYes');
  const buttonNo = document.getElementById('buttonNo');
 
  const statusText = document.getElementById('statusText');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const resultImage = document.getElementById('resultImage');
  const actionButtons = document.getElementById('actionButtons');

  const revealCanvas = document.getElementById('revealCanvas');
 
  // CAMERA INIT
  async function initCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
    } catch (error) {
      console.error("Camera error:", error);
      alert("Unable to access camera. Please ensure you've granted camera permissions.");
    }
  }
  initCamera();
 
  // TAKE PHOTO
  buttonTake.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
 
    const imageData = canvas.toDataURL('image/png');
    sessionStorage.setItem('tempImage', imageData);
 
    photoPreview.src = imageData;
 
    screenCamera.classList.add('hidden');
    screenConfirm.classList.remove('hidden');
  });
 
  // CONFIRM PHOTO
  buttonYes.addEventListener('click', () => {
    sessionStorage.setItem('capturedImage', sessionStorage.getItem('tempImage'));
    screenConfirm.classList.add('hidden');
    screenWeapon.classList.remove('hidden');
  });
 
  buttonNo.addEventListener('click', () => {
    screenConfirm.classList.add('hidden');
    screenCamera.classList.remove('hidden');
  });
 
  // SELECTION MECHANIC
  document.querySelectorAll('.optionContainer').forEach(option => {
    option.addEventListener('click', function() {
      const choiceType = this.getAttribute('data-choice');
     
      // Remove selected from all options of this type
      document.querySelectorAll(`[data-choice="${choiceType}"]`).forEach(opt => {
        opt.classList.remove('selected');
      });
     
      // Add selected to clicked option
      this.classList.add('selected');
     
      // Enable the corresponding button
      const btnId = 'btn' + choiceType.charAt(0).toUpperCase() + choiceType.slice(1);
      document.getElementById(btnId).disabled = false;
    });
  });
 
  // WEAPON
  document.getElementById('btnWeapon').addEventListener('click', () => {
    const selected = document.querySelector('[data-choice="weapon"].selected');
    chosenWeapon = selected.getAttribute('data-value');
    sessionStorage.setItem('weapon', chosenWeapon);
 
    screenWeapon.classList.add('hidden');
    screenTheme.classList.remove('hidden');
  });
 
  // THEME
  document.getElementById('btnTheme').addEventListener('click', () => {
    const selected = document.querySelector('[data-choice="theme"].selected');
    chosenTheme = selected.getAttribute('data-value');
    sessionStorage.setItem('theme', chosenTheme);
 
    screenTheme.classList.add('hidden');
    screenOutfit.classList.remove('hidden');
  });
 
  // OUTFIT
  document.getElementById('btnOutfit').addEventListener('click', () => {
    const selected = document.querySelector('[data-choice="outfit"].selected');
    chosenOutfit = selected.getAttribute('data-value');
    sessionStorage.setItem('outfit', chosenOutfit);
 
    screenOutfit.classList.add('hidden');
    screenSidekick.classList.remove('hidden');
  });
 
  // SIDEKICK (Final step - triggers generation)
  document.getElementById('btnSidekick').addEventListener('click', () => {
    if (isGenerating) return;
   
    const selected = document.querySelector('[data-choice="sidekick"].selected');
    chosenSidekick = selected.getAttribute('data-value');
    sessionStorage.setItem('sidekick', chosenSidekick);
 
    const prompt = generatePrompt(
      chosenWeapon,
      chosenTheme,
      chosenOutfit,
      chosenSidekick
    );
 
    sessionStorage.setItem('prompt', prompt);
 
    screenSidekick.classList.add('hidden');
    screenResult.classList.remove('hidden');
 
    // Start AI generation
    submitToBackend(prompt);
  });
 
  // PROMPT GENERATOR
  function generatePrompt(weapon, theme, outfit, sidekick) {
    return `A cinematic movie scene set in a ${theme} world.
The main character wields a ${weapon}.
They are dressed in a ${outfit}.
Their loyal companion is a ${sidekick}.
Use the captured face as a reference, not the starting frame.
Dramatic lighting, dynamic camera movement, realistic textures,
blockbuster film quality, 4K, shallow depth of field, epic atmosphere.`;
  }
 

  function startPixelReveal(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = revealCanvas;
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      revealCanvas.style.display = "block";
      resultImage.style.display = "none";
      actionButtons.style.display = "none";

      const stages = [
        {
          pixelSize: 8,
          noise: 1.0,
          alpha: 0.0,
          blur: 18,
          duration: 2000,
          text: "Starting from visual noise..."
        },
        {
          pixelSize: 12,
          noise: 0.85,
          alpha: 0.15,
          blur: 16,
          duration: 2000,
          text: "AI is searching for shapes..."
        },
        {
          pixelSize: 20,
          noise: 0.65,
          alpha: 0.3,
          blur: 12,
          duration: 2000,
          text: "A character is slowly appearing..."
        },
        {
          pixelSize: 36,
          noise: 0.45,
          alpha: 0.5,
          blur: 9,
          duration: 2000,
          text: "Your movie world is becoming clearer..."
        },
        {
          pixelSize: 70,
          noise: 0.25,
          alpha: 0.7,
          blur: 5,
          duration: 2000,
          text: "Adding final details..."
        },
        {
          pixelSize: 140,
          noise: 0.1,
          alpha: 0.9,
          blur: 2,
          duration: 2000,
          text: "Almost ready..."
        },
        {
          pixelSize: img.width,
          noise: 0,
          alpha: 1,
          blur: 0,
          duration: 2000,
          text: "Pa-bam! Your character is ready!"
        }
      ];

      let stageIndex = 0;

      function drawNoiseLayer(noiseAmount) {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Random colorful cinematic noise
          const purple = Math.random() * 180 + 50;
          const yellow = Math.random() * 180 + 40;
          const pink = Math.random() * 160 + 60;
          const blue = Math.random() * 140 + 80;

          // Randomly choose a color family for each pixel
          const colorType = Math.random();

          if (colorType < 0.35) {
            // purple / violet
            data[i] = purple;
            data[i + 1] = 40;
            data[i + 2] = 220;
          } else if (colorType < 0.6) {
            // golden / yellow
            data[i] = 255;
            data[i + 1] = yellow;
            data[i + 2] = 40;
          } else if (colorType < 0.82) {
            // pink / magenta
            data[i] = 240;
            data[i + 1] = 60;
            data[i + 2] = pink;
          } else {
            // blue / cosmic
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
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.restore();
        ctx.filter = "none";
        ctx.globalAlpha = 1;
      }

      function drawStage() {
        const stage = stages[stageIndex];

        statusText.innerText = stage.text;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. спочатку малюємо шум
        drawNoiseLayer(stage.noise);

        // 2. поверх шуму поступово проявляємо картинку
        drawPixelatedImage(stage);

        stageIndex++;

        if (stageIndex < stages.length) {
          setTimeout(drawStage, stage.duration);
        } else {
          setTimeout(() => {
            revealCanvas.style.display = "none";

            resultImage.src = imageUrl;
            resultImage.style.display = "block";

            actionButtons.style.display = "block";

            resolve();
          }, 800);
        }
      }

      drawStage();
    };

    img.onerror = () => {
      reject(new Error("Could not load generated image for reveal animation."));
    };

    img.src = imageUrl;
  });
}
  
  // SUBMIT TO BACKEND (AI GENERATION)
  async function submitToBackend(prompt) {
    try {
      isGenerating = true;
     
      // Reset UI
      statusText.innerText = "Generating your cinematic scene...";
      loadingSpinner.style.display = "block";
      resultImage.style.display = "none";
      actionButtons.style.display = "none";
 
      const dataUrl = sessionStorage.getItem("capturedImage");
      if (!dataUrl) {
        statusText.innerText = "Error: No photo found. Please start over.";
        loadingSpinner.style.display = "none";
        isGenerating = false;
        return;
      }
 
      // Convert dataURL to Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
 
      const formData = new FormData();
      formData.append("photo", blob, "capture.png");
      formData.append("prompt", prompt);
 
      const apiResponse = await fetch("http://localhost:5000/api/submit", {
        method: "POST",
        body: formData
      });
 
      const data = await apiResponse.json().catch(() => ({}));
      console.log("Backend response:", data);
 
      if (!apiResponse.ok) {
        statusText.innerText = "Generation failed: " + (data.error || `HTTP ${apiResponse.status}`);
        loadingSpinner.style.display = "none";
        isGenerating = false;
        return;
      }
 
      if (!data.image_url) {
        statusText.innerText = "Error: No image received from server.";
        loadingSpinner.style.display = "none";
        isGenerating = false;
        return;
      }
 
      const finalImageUrl = "http://localhost:5000" + data.image_url;

      statusText.innerText = "Preparing your movie character...";
      loadingSpinner.style.display = "none";

      sessionStorage.setItem("job_id", data.job_id || "");
      sessionStorage.setItem("image_url", data.image_url);

      await startPixelReveal(finalImageUrl);


      
    } catch (error) {
      console.error("Generation error:", error);
      statusText.innerText = "Failed to generate image: " + (error.message || error);
      loadingSpinner.style.display = "none";
      revealCanvas.style.display = "none";
    } finally {
      isGenerating = false;
    }
  }
 
  // DOWNLOAD IMAGE
  function downloadImage() {
    const imageUrl = resultImage.src;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'my-movie-character.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
 
  // START OVER
  function startOver() {
    // Clear session storage
    sessionStorage.clear();
   
    // Reset state
    chosenWeapon = "";
    chosenTheme = "";
    chosenOutfit = "";
    chosenSidekick = "";
   
    // Reset all selections
    document.querySelectorAll('.optionContainer').forEach(opt => {
      opt.classList.remove('selected');
    });
   
    // Disable all next buttons
    document.getElementById('btnWeapon').disabled = true;
    document.getElementById('btnTheme').disabled = true;
    document.getElementById('btnOutfit').disabled = true;
    document.getElementById('btnSidekick').disabled = true;
   
    // Hide all screens except camera
    screenConfirm.classList.add('hidden');
    screenWeapon.classList.add('hidden');
    screenTheme.classList.add('hidden');
    screenOutfit.classList.add('hidden');
    screenSidekick.classList.add('hidden');
    screenResult.classList.add('hidden');
    screenCamera.classList.remove('hidden');

    revealCanvas.style.display = "none";
    resultImage.style.display = "none";
    actionButtons.style.display = "none";
    loadingSpinner.style.display = "none";


  }