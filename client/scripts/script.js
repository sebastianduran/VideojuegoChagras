// se comunica con el escrip app.js
const socket = io();

/* Variables y constantes que apuntan a un
 * elemento del documento HTML
 */
let map = document.querySelector(".map");
let x = 70;
let y = 34;
let held_directions = []; //State of which arrow keys we are holding down
let speed = 1;

const signDiv = document.querySelector(".signDiv");
const signDivUser = document.getElementById("signDiv-user");
const signDivPass = document.getElementById("signDiv-pass");
const signDivSignIn = document.getElementById("signDiv-signIn");
const signDivSignUp = document.getElementById("signDiv-signUp");
const kmsButton = document.getElementById("kms-button");
const reviveButton = document.getElementById("revive-button");
const timeStamp = document.getElementById("timeStamp");
const playerListDisplay = document.getElementById("player-list");
const menuSelectChar = document.querySelector(".menu-select-char");
const personaje1 = document.getElementById("char1");
const personaje2 = document.getElementById("char2");
const personaje3 = document.getElementById("char3");

signDivSignIn.onclick = function () {
  socket.emit("signIn", {
    username: signDivUser.value.trim(),
    password: signDivPass.value.trim()
  });
};

signDivSignUp.onclick = function () {
  socket.emit("signUp", {
    username: signDivUser.value.trim(),
    password: signDivPass.value.trim()
  });
};

personaje1.onclick = function () {
  menuSelectChar.style.display = "none";
  socket.emit("charSelect", { char: "DemoRpgCharacter" });
  handlerCamera();
};

socket.on("signUpResponse", function (data) {
  if (data.success) {
    alert("Registro exitoso!");
  } else alert("Sign Up unsuccessful! Name already taken!");
});

socket.on("signInResponse", function (data) {
  if (data.success) {
    signDiv.style.display = "none";
    socket.emit("socket_client_id", { socket_id: socket.id });
  } else alert("Sign in unsuccessful");
});

socket.on("renderInfo", function (playerData) {
  playerListDisplay.innerHTML = "";
  for (let player of playerData) {
    if (player.char) {
      placeCharacter(player);
      handlerCamera();
      handlerPlayer();
    }
    playerListDisplay.innerHTML +=
      "<div>" + player.username + ": " + player.points + "</div>";
  }
});

let pixelSize = parseInt(
  getComputedStyle(document.documentElement).getPropertyValue("--pixel-size"),
  0
);

const placeCharacter = (player) => {
  if (player.char) {
    let char_element = document.getElementById("char_" + player.id);
    if (!char_element) {
      map.innerHTML +=
        "<div id='char_" +
        player.id +
        "'" +
        "class='char' facing='down'> " +
        "<div id='char_spritesheet_" +
        player.id +
        "' " +
        "class='char_spritesheet pixel-art' " +
        "style='background: url(/client/sprites/" +
        player.char +
        ".png) no-repeat no-repeat; '" +
        "></div>" +
        "</div>";
    }
    if (char_element) {
      let char_spritesheet = document.getElementById(
        "char_spritesheet_" + player.id
      );
      switch (player.lastPosition) {
        case "right":
          char_spritesheet.style.backgroundPositionY = `${pixelSize * -40}px`;
          break;
        case "left":
          char_spritesheet.style.backgroundPositionY = `${pixelSize * -120}px`;
          break;
        case "up":
          char_spritesheet.style.backgroundPositionY = `${pixelSize * -80}px`;
          break;
        case "down":
          char_spritesheet.style.backgroundPositionY = `${pixelSize * 0}px`;
          break;
        default:
          break;
      }
      char_element.style.width = `${pixelSize * 8 * 5}px`;
      char_element.style.height = `${pixelSize * 8 * 5}px`;
      char_spritesheet.style.width = `${pixelSize * 8 * 20}px`;
      char_spritesheet.style.height = `${pixelSize * 8 * 20}px`;
      char_spritesheet.style.backgroundSize = `100%`;
      char_element.style.transform = `translate3d( 
          ${player.x * pixelSize + 30}px, 
          ${player.y * pixelSize}px,
          0 )`;
    }
  }
};

const camera_left = pixelSize * 45;
const camera_top = pixelSize * 34;

function handlerCamera() {
  map.style.transform = `translate3d( 
    ${-x * pixelSize + camera_left}px, 
    ${-y * pixelSize + camera_top}px, 
    0 )`;
}

function handlerPlayer() {
  const held_direction = held_directions[0];
  if (held_direction) {
    if (held_direction === "right") {
      x += speed;
    }
    if (held_direction === "left") {
      x -= speed;
    }
    if (held_direction === "down") {
      y += speed;
    }
    if (held_direction === "up") {
      y -= speed;
    }
    socket.emit("keyPress", {
      x: x,
      y: y,
      lastPosition: held_direction
    });
  }
}

socket.on("removeChar", function (player) {
  document.getElementById("char_" + player.id).innerHTML = " ";
});

kmsButton.onclick = function () {
  socket.emit("kms");
};

reviveButton.onclick = function () {
  socket.emit("revive");
};

socket.on("Time", function () {
  const date = Date().slice(4, 24);
  timeStamp.innerHTML = date;
});

const chatText = document.getElementById("chat-text");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

socket.on("addToChat", function (data) {
  chatText.innerHTML += "<div>" + data + "</div>";
  chatText.scrollTop = chatText.scrollHeight;
});

chatForm.onsubmit = function (event) {
  event.preventDefault();
  if (chatInput.value.substring(0, 1) === "/")
    socket.emit(
      "sendCommandToServer",
      chatInput.value.substring(1, chatInput.value.length)
    );

  socket.emit("sendMsgToServer", chatInput.value);

  chatInput.value = "";
};

/* Direction key state */
const directions = {
  up: "up",
  down: "down",
  left: "left",
  right: "right"
};
const actions = {
  star: "star",
  lighting: "down",
  water: "water",
  tree: "tree"
};
const keys = {
  87: directions.up,
  65: directions.left,
  68: directions.right,
  83: directions.down,
  85: actions.star,
  73: actions.lighting,
  74: actions.water,
  75: actions.tree
};

function inTextField(event) {
  var elem = event.target || event.srcElement;
  if (elem.nodeType === 3) elem = elem.parentNode;

  return (
    elem.tagName === "TEXTAREA" ||
    (elem.tagName === "INPUT" && elem.getAttribute("type") === "text")
  );
}

document.addEventListener("keydown", (e) => {
  if (!inTextField(e)) {
    var dir = keys[e.which];
    if (dir && held_directions.indexOf(dir) === -1) {
      held_directions.unshift(dir);
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (!inTextField(e)) {
    var dir = keys[e.which];
    var index = held_directions.indexOf(dir);
    if (index > -1) {
      held_directions.splice(index, 1);
    }
  }
});

/* BONUS! Dpad functionality for mouse and touch */
var isPressed = false;
const removePressedAll = () => {
  document.querySelectorAll(".dpad-button").forEach((d) => {
    d.classList.remove("pressed");
  });
};
document.body.addEventListener("mousedown", () => {
  isPressed = true;
});
document.body.addEventListener("mouseup", () => {
  isPressed = false;
  removePressedAll();
});
const handleDpadPress = (direction, click) => {
  if (click) {
    isPressed = true;
  }
  held_directions = isPressed ? [direction] : [];
  if (isPressed) {
    removePressedAll();
    document.querySelector(".dpad-" + direction).classList.add("pressed");
  }
};
//Atando los eventos para el dpad
document
  .querySelector(".dpad-left")
  .addEventListener("touchstart", (e) =>
    handleDpadPress(directions.left, true)
  );
document
  .querySelector(".dpad-up")
  .addEventListener("touchstart", (e) => handleDpadPress(directions.up, true));
document
  .querySelector(".dpad-right")
  .addEventListener("touchstart", (e) =>
    handleDpadPress(directions.right, true)
  );
document
  .querySelector(".dpad-down")
  .addEventListener("touchstart", (e) =>
    handleDpadPress(directions.down, true)
  );

document
  .querySelector(".dpad-left")
  .addEventListener("mousedown", (e) => handleDpadPress(directions.left, true));
document
  .querySelector(".dpad-up")
  .addEventListener("mousedown", (e) => handleDpadPress(directions.up, true));
document
  .querySelector(".dpad-right")
  .addEventListener("mousedown", (e) =>
    handleDpadPress(directions.right, true)
  );
document
  .querySelector(".dpad-down")
  .addEventListener("mousedown", (e) => handleDpadPress(directions.down, true));
