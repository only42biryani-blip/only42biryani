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

/* LOAD INVENTORY */

async function loadInventory(){

  const { data, error } =
    await supabaseClient
      .from("inventory")
      .select("*")
      .eq("id", 1)
      .single();

  if(error){

    console.log(error);

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

setInterval(
  loadInventory,
  3000
);

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

setInterval(loadInventory, 3000);
