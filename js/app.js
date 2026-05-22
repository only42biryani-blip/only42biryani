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

  updateInventoryUI(data.remaining);

}

function updateInventoryUI(currentInventory){

  const inventoryCount =
    document.getElementById("inventoryCount");

  const inventoryText =
    document.getElementById("inventoryText");

  const dropStatus =
    document.getElementById("dropStatus");

  const floatingTag =
    document.querySelector(".floating-tag");

  const inventoryBox =
    document.querySelector(".inventory-box");

  inventoryCount.innerHTML =
    currentInventory + " / " + totalInventory;

  if(floatingTag){

    floatingTag.innerHTML =
      currentInventory + " / " + totalInventory;

  }

  if(currentInventory <= 10){

    inventoryBox.classList.add(
      "inventory-danger"
    );

  }else{

    inventoryBox.classList.remove(
      "inventory-danger"
    );

  }

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

  }else{

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

loadInventory();

setInterval(loadInventory, 3000);