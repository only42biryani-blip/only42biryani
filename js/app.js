const SUPABASE_URL =
  "https://pubtyadwysqdozzhgzyz.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YnR5YWR3eXNxZG96emhnenl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDgxNDEsImV4cCI6MjA5NDk4NDE0MX0.uj4V8SXb5sCouvVRq6E8GZNsvefSg0QpbsARqVQAFTk";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let totalInventory = 42;

/* PRE-LAUNCH MODE
   Product has not launched yet — show a "coming soon" preview
   instead of live/sold-out inventory claims. Flip to false on
   launch day to resume real Supabase-driven inventory. */

const PRE_LAUNCH_MODE = true;

/* LOAD INVENTORY */

async function loadInventory(){

  if(PRE_LAUNCH_MODE){

    updateInventoryUI(totalInventory);

    return;

  }

  const { data, error } =
    await supabaseClient
      .from("inventory")
      .select("*")
      .eq("id", 1)
      .single();

  if(error || !data){

    console.log(error || "No inventory data found");

    return;

  }

  updateInventoryUI(
    data.remaining
  );

}

/* UPDATE UI */

function updateInventoryUI(currentInventory){

  const inventoryCount =
    document.getElementById(
      "inventoryCount"
    );

  const inventoryText =
    document.getElementById(
      "inventoryText"
    );

  const dropStatus =
    document.getElementById(
      "dropStatus"
    );

  const floatingTag =
    document.querySelector(
      ".floating-tag"
    );

  const inventoryBox =
    document.querySelector(
      ".inventory-box"
    );

  const progressFill =
    document.getElementById(
      "inventoryProgressFill"
    );

  if(PRE_LAUNCH_MODE){

    inventoryCount.innerHTML =
      totalInventory + " / " + totalInventory;

    inventoryText.innerHTML =
      "PLATES PER DROP";

    inventoryCount.style.color =
      "#D4FF3F";

    dropStatus.innerHTML =
      '<span class="live-dot"></span> PREVIEW — LAUNCHING SOON';

    dropStatus.style.color =
      "#D4FF3F";

    if(floatingTag){

      floatingTag.innerHTML =
        "COMING SOON";

    }

    progressFill.style.width =
      "100%";

    progressFill.style.background =
      "#D4FF3F";

    progressFill.classList.remove(
      "low-inventory"
    );

    inventoryBox.classList.remove(
      "inventory-danger"
    );

    document.body.classList.remove(
      "sold-out-mode"
    );

    return;

  }

  /* MAIN INVENTORY */

  inventoryCount.innerHTML =
    currentInventory + " / " + totalInventory;

  /* FLOATING TAG */

  if(floatingTag){

    floatingTag.innerHTML =
      currentInventory + " / " + totalInventory;

  }

  /* PROGRESS BAR */

  let percentage =
    (currentInventory / totalInventory) * 100;

  progressFill.style.width =
    percentage + "%";

  progressFill.classList.remove(
    "low-inventory"
  );

  inventoryBox.classList.remove(
    "inventory-danger"
  );

  /* HIGH INVENTORY */

  if(currentInventory >= 20){

    progressFill.style.background =
      "#D4FF3F";

    progressFill.style.color =
      "#D4FF3F";

    inventoryCount.style.color =
      "#D4FF3F";

  }

  /* MEDIUM INVENTORY */

  else if(currentInventory >= 8){

    progressFill.style.background =
      "#ff7b00";

    progressFill.style.color =
      "#ff7b00";

    inventoryCount.style.color =
      "#ff7b00";

  }

  /* LOW INVENTORY */

  else if(currentInventory >= 1){

    progressFill.style.background =
      "#ff3b30";

    progressFill.style.color =
      "#ff3b30";

    inventoryCount.style.color =
      "#ff3b30";

    progressFill.classList.add(
      "low-inventory"
    );

    inventoryBox.classList.add(
      "inventory-danger"
    );

  }

  /* SOLD OUT */

  if(currentInventory <= 0){

    inventoryText.innerHTML =
      "DEG EMPTY";

    dropStatus.innerHTML =
      "DROP STATUS — SOLD OUT";

    dropStatus.style.color =
      "#ff4d4d";

    document.body.classList.add(
      "sold-out-mode"
    );

    progressFill.style.width =
      "100%";

    progressFill.style.background =
      "#ff0000";

    inventoryCount.style.color =
      "#ff3b30";

  }

  /* LIVE MODE */

  else{

    inventoryText.innerHTML =
      "LEFT TODAY";

    dropStatus.innerHTML =
      '<span class="live-dot"></span> DROP STATUS — LIVE';

    dropStatus.style.color =
      "#D4FF3F";

    document.body.classList.remove(
      "sold-out-mode"
    );

  }

}

/* AUTO REFRESH */

loadInventory();

if(!PRE_LAUNCH_MODE){

  setInterval(
    loadInventory,
    3000
  );

}

/* WAITLIST SUBMISSION & LIVE STATS */

let currentWaitlistCount = 0;

async function initWaitlistCounter() {
  let finalCount = 142; // default fallback seed
  try {
    const { count, error } = await supabaseClient
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    finalCount = 142 + (count || 0);
  } catch (err) {
    console.log("Could not fetch waitlist count from database, using local fallback seed.");
    const localList = JSON.parse(localStorage.getItem("waitlist") || "[]");
    finalCount = 142 + localList.length;
  }
  animateWaitlistCounter(finalCount);
}

function animateWaitlistCounter(target) {
  const counterEl = document.getElementById("waitlistLiveCounter");
  if (!counterEl) return;

  let current = 0;
  const duration = 1200; // 1.2s total count-up
  const steps = 40;
  const increment = Math.ceil(target / steps);
  const stepTime = duration / steps;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    counterEl.innerText = current;
  }, stepTime);

  currentWaitlistCount = target;
}

// Initialize waitlist counter
initWaitlistCounter();

const waitlistForm =
  document.getElementById(
    "waitlistForm"
  );

if(waitlistForm){

  waitlistForm.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      const nameInput =
        document.getElementById(
          "waitlistName"
        );

      const phoneInput =
        document.getElementById(
          "waitlistPhone"
        );

      const emailInput =
        document.getElementById(
          "waitlistEmail"
        );

      const errorEl =
        document.getElementById(
          "waitlistError"
        );

      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim().replace(/[\s\-]/g, "");
      const email = emailInput.value.trim().toLowerCase();

      const phonePattern = /^(\+91)?[6-9]\d{9}$/;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      errorEl.classList.remove("active");
      errorEl.innerText = "";

      if(!phonePattern.test(phone)){

        errorEl.innerText =
          "Enter a valid 10-digit mobile number.";

        errorEl.classList.add("active");

        phoneInput.focus();

        return;

      }

      if(!emailPattern.test(email)){

        errorEl.innerText =
          "Enter a valid email address.";

        errorEl.classList.add("active");

        emailInput.focus();

        return;

      }

      try {

        // Try writing to Supabase waitlist table
        const { error } =
          await supabaseClient
            .from("waitlist")
            .insert([{ name: name, phone: phone, email: email }]);

        if(error) throw error;

        console.log("Saved to Supabase Waitlist");

      } catch(err) {

        console.log(
          "Supabase write failed, falling back to LocalStorage:",
          err.message || err
        );

        // Fallback to local storage
        let localList =
          JSON.parse(
            localStorage.getItem(
              "waitlist"
            ) || "[]"
          );

        const alreadyExists =
          localList.some(
            entry => entry.email === email
          );

        if(!alreadyExists){

          localList.push({ name, phone, email });

          localStorage.setItem(
            "waitlist",
            JSON.stringify(localList)
          );

        }

      }

      // Increment live counter visually with dynamic update
      currentWaitlistCount++;
      const counterEl = document.getElementById("waitlistLiveCounter");
      if (counterEl) {
        counterEl.innerText = currentWaitlistCount;
      }

      // Show the success modal
      const modal =
        document.getElementById(
          "waitlistModal"
        );

      if(modal){

        modal.classList.add("active");

      }

      waitlistForm.reset();

    }
  );

}

/* NEXT DROP COUNTDOWN TIMER TIMER */

function startCountdown() {
  function updateCountdown() {
    const now = new Date();
    let target = new Date();
    target.setHours(12, 30, 0, 0); // Drop daily at 12:30 PM

    // If it's past 12:30 PM, the target is tomorrow at 12:30 PM
    if (now.getTime() > target.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    const diff = target.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const hrsEl = document.getElementById("countdownHours");
    const minsEl = document.getElementById("countdownMinutes");
    const secsEl = document.getElementById("countdownSeconds");

    if (hrsEl && minsEl && secsEl) {
      hrsEl.innerText = String(hours).padStart(2, "0");
      minsEl.innerText = String(minutes).padStart(2, "0");
      secsEl.innerText = String(seconds).padStart(2, "0");
    }
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

startCountdown();

/* 3D CARD TILT WITH SHEEN EFFECT */

const tiltCards = document.querySelectorAll(".tilt-card");

tiltCards.forEach((card) => {
  const sheen = card.querySelector(".sheen-overlay");

  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle premium tilt (max 8 degrees)
    const rotateX = ((centerY - y) / centerY) * 8;
    const rotateY = ((x - centerX) / centerX) * 8;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

    if (sheen) {
      sheen.style.opacity = "1";
      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;
      sheen.style.background = `radial-gradient(circle at ${xPercent}% ${yPercent}%, rgba(255, 255, 255, 0.16) 0%, transparent 60%)`;
    }
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    if (sheen) {
      sheen.style.opacity = "0";
    }
  });
});

/* SCROLL REVEAL */

const revealElements =
  document.querySelectorAll(
    ".manifesto-card, .product-card, .statement-section"
  );

window.addEventListener(
  "scroll",
  () => {

    revealElements.forEach(
      (el) => {

        const top =
          el.getBoundingClientRect().top;

        if(
          top < window.innerHeight - 100
        ){

          el.classList.add(
            "active"
          );

        }

      }
    );

  }
);

/* CURSOR GLOW */

const glow =
  document.querySelector(
    ".cursor-glow"
  );

document.addEventListener(
  "mousemove",
  e => {

    if(glow){

      glow.style.left =
        e.clientX + "px";

      glow.style.top =
        e.clientY + "px";

    }

  }
);