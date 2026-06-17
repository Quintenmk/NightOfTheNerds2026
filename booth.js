console.log("PHOTO BOOTH LOADED", new Date().toISOString());

let cameraStream = null;
let countdownTimer = null;
let countdownRemaining = 10;

const video = document.getElementById("videoLive");
const screenIdle = document.getElementById("screenIdle");
const screenCamera = document.getElementById("screenCamera");
const screenWaiting = document.getElementById("screenWaiting");
const idleTitle = document.getElementById("idleTitle");
const idleMessage = document.getElementById("idleMessage");
const waitingTitle = document.getElementById("waitingTitle");
const waitingMessage = document.getElementById("waitingMessage");
const countdownBadge = document.getElementById("countdownBadge");
const countdownStatus = document.getElementById("countdownStatus");

const boothStates = {
  IDLE: "idle",
  QUIZ_STARTED: "quiz_started",
  READY_FOR_PHOTO: "ready_for_photo",
  TAKING_PHOTO: "taking_photo",
  PHOTO_READY: "photo_ready",
  GENERATING: "generating",
  FINISHED: "finished"
};

function hideBoothScreens() {
  [screenIdle, screenCamera, screenWaiting].forEach((screen) => {
    screen.classList.add("hidden");
  });
}

async function initCamera() {
  try {
    if (cameraStream) return;

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 24, max: 30 },
        facingMode: "user"
      }
    });
    video.srcObject = cameraStream;
    await video.play().catch((error) => {
      console.warn("Camera preview could not autoplay yet:", error);
    });
  } catch (error) {
    console.error("Camera error:", error);
    alert("Unable to access camera. Please ensure you've granted camera permissions.");
  }
}

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  countdownRemaining = 10;
  if (countdownBadge) countdownBadge.textContent = "10";
  if (countdownStatus) countdownStatus.textContent = "Get ready...";
}

function startCountdown() {
  clearCountdown();
  countdownBadge.textContent = String(countdownRemaining);
  countdownStatus.textContent = "Photo in 10 seconds";

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

function stopCamera() {
  clearCountdown();
  if (!cameraStream) return;

  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  video.srcObject = null;
}

function showIdle(state) {
  stopCamera();

  if (state === boothStates.FINISHED) {
    idleTitle.innerHTML = `<span class="title-white">Please wait for</span><span class="title-gold">the next quiz</span>`;
    idleMessage.textContent = "The main screen is ready for the next group.";
  } else if (state === boothStates.QUIZ_STARTED) {
    idleTitle.innerHTML = `<span class="title-white">Quiz is</span><span class="title-gold">in progress</span>`;
    idleMessage.textContent = "Get ready for the photo step.";
  } else {
    idleTitle.innerHTML = `<span class="title-white">Quiz hasn't</span><span class="title-gold">started yet</span>`;
    idleMessage.textContent = "Wait for the main screen to begin.";
  }

  hideBoothScreens();
  screenIdle.classList.remove("hidden");
}

async function showCamera(shouldStartCountdown = false) {
  hideBoothScreens();
  screenCamera.classList.remove("hidden");
  await initCamera();

  if (shouldStartCountdown) {
    countdownBadge.style.display = "grid";
    startCountdown();
    return;
  }

  clearCountdown();
  countdownBadge.style.display = "none";
  countdownStatus.textContent = "Live preview is ready. Wait for the main screen to start the countdown";
}

function showWaiting(state) {
  stopCamera();

  if (state === boothStates.GENERATING) {
    waitingTitle.innerHTML = `<span class="title-white">Return to</span><span class="title-gold">the main screen</span>`;
    waitingMessage.textContent = "Your AI image is being generated there.";
  } else {
    waitingTitle.innerHTML = `<span class="title-white">Return to</span><span class="title-gold">the main screen</span>`;
    waitingMessage.textContent = "Review your picture there before the AI image is generated.";
  }

  hideBoothScreens();
  screenWaiting.classList.remove("hidden");
}

function syncBoothMode() {
  const state = localStorage.getItem("boothState") || boothStates.IDLE;

  if (state === boothStates.READY_FOR_PHOTO) {
    showCamera(false);
    return;
  }

  if (state === boothStates.TAKING_PHOTO) {
    showCamera(true);
    return;
  }

  if (state === boothStates.PHOTO_READY || state === boothStates.GENERATING) {
    showWaiting(state);
    return;
  }

  showIdle(state);
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
  formData.append("photo", blob, "booth-capture.jpg");

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
  if (!video.videoWidth || !video.videoHeight) {
    countdownStatus.textContent = "Camera is warming up...";
    setTimeout(startCountdown, 900);
    return;
  }

  const maxSize = 1920;
  const scale = Math.min(1, maxSize / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  try {
    countdownStatus.textContent = "Uploading photo...";
    const data = await uploadCapturedPhoto(canvas);
    localStorage.setItem("photoJobId", data.job_id);
    localStorage.setItem("photoReadyAt", String(Date.now()));
    localStorage.setItem("boothState", boothStates.PHOTO_READY);
    showWaiting(boothStates.PHOTO_READY);
  } catch (error) {
    console.error("Photo upload error:", error);
    countdownStatus.textContent = "Upload failed. Trying again...";
    setTimeout(startCountdown, 1200);
  }
}

window.addEventListener("storage", (event) => {
  if (event.key === "boothState") {
    syncBoothMode();
  }
});

syncBoothMode();
