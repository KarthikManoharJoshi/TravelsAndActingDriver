const purposeSelect = document.getElementById("purpose");
const otherPurposeBox = document.getElementById("otherPurposeBox");
const otherPurposeInput = document.getElementById("otherPurpose");
const serviceSelect = document.getElementById("serviceType");

purposeSelect.addEventListener("change", function() {
  if (this.value === "Other") {
    otherPurposeBox.classList.remove("hidden");
    otherPurposeInput.required = true;
  } else {
    otherPurposeBox.classList.add("hidden");
    otherPurposeInput.required = false;
    otherPurposeInput.value = "";
  }
});

document.getElementById("travelForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const email = document.getElementById("email").value;
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  const days = document.getElementById("days").value;
  const purpose = purposeSelect.value === "Other" ? otherPurposeInput.value : purposeSelect.value;
  const serviceType = serviceSelect.value;

  if (!serviceType) {
    alert("Please select a service type.");
    return;
  }

  try {
    const response = await fetch("/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, from, to, days, purpose, serviceType, message: document.getElementById("message").value })
    });

    const result = await response.json();
    alert(result.message);

    document.getElementById("travelForm").reset();
    otherPurposeBox.classList.add("hidden");
    otherPurposeInput.required = false;
  } catch (err) {
    console.error(err);
    alert("Network error. Try again later.");
  }
});
