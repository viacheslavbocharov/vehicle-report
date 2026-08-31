const form = document.getElementById("reportForm");
const vehicleInput = document.getElementById("vehicleNumber");
const submitButton = document.getElementById("submitButton");
const statusElement = document.getElementById("status");
const formView = document.getElementById("formView");
const successView = document.getElementById("successView");

vehicleInput.addEventListener("input", () => {
  vehicleInput.value = vehicleInput.value.toUpperCase();
});

function getLocation() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({
        latitude: null,
        longitude: null,
        accuracy: null,
        locationStatus: "not_supported",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          locationStatus: "provided",
        });
      },
      (error) => {
        const statuses = {
          1: "permission_denied",
          2: "position_unavailable",
          3: "timeout",
        };

        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          locationStatus: statuses[error.code] || "unknown_error",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitButton.disabled = true;
  statusElement.classList.remove("error");
  statusElement.textContent = "Отримуємо геолокацію…";

  try {
    const location = await getLocation();

    statusElement.textContent = "Надсилаємо дані…";

    const response = await fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vehicleNumber: vehicleInput.value.trim(),
        ...location,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Не вдалося надіслати дані.");
    }

    formView.classList.add("hidden");
    successView.classList.remove("hidden");
  } catch (error) {
    console.error(error);
    statusElement.classList.add("error");
    statusElement.textContent =
      "Не вдалося надіслати дані. Спробуйте ще раз.";
    submitButton.disabled = false;
  }
});
