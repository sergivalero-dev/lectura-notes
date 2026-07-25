// Mapeos de niveles por defecto
const LEVELS = {
  1: ["c/4", "d/4", "e/4"],
  2: ["c/4", "d/4", "e/4", "f/4", "g/4"],
  3: ["c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4"],
  4: ["c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4", "c/5", "d/5", "e/5", "f/5"]
};

// Rango completo F3 a C6 (19 notas)
const ALL_NOTES = [
  "f/3", "g/3", "a/3", "b/3",
  "c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4",
  "c/5", "d/5", "e/5", "f/5", "g/5", "a/5", "b/5",
  "c/6"
];

// Nombres para mostrar bajo la casilla
const NOTE_NAMES = [
  "Fa3", "Sol3", "La3", "Si3",
  "Do4", "Re4", "Mi4", "Fa4", "Sol4", "La4", "Si4",
  "Do5", "Re5", "Mi5", "Fa5", "Sol5", "La5", "Si5",
  "Do6"
];

// Set que almacena exactamente las notas activas
let customSelectedNotes = new Set(["c/4", "d/4", "e/4", "f/4", "g/4"]);

let currentNote = "";
let lastNote = "";
let hits = 0;
let errors = 0;
let timerId = null;

// Elementos DOM
const hitsEl = document.getElementById("hits");
const errorsEl = document.getElementById("errors");
const feedbackEl = document.getElementById("feedback");
const difficultyEl = document.getElementById("difficulty");
const staffContainer = document.getElementById("staff");
const nextBtn = document.getElementById("next-btn");

const timerEnableEl = document.getElementById("timer-enable");
const timerSpeedEl = document.getElementById("timer-speed");

const customContainer = document.getElementById("custom-selector-container");
const customStaffEl = document.getElementById("custom-staff");
const checkboxesContainer = document.getElementById("checkboxes-container");
const selectAllBtn = document.getElementById("select-all-btn");
const deselectAllBtn = document.getElementById("deselect-all-btn");

// Obtiene de forma estricta las notas habilitadas para el juego
function getActivePool() {
  if (difficultyEl.value === "custom") {
    const pool = Array.from(customSelectedNotes);
    return pool.length > 0 ? pool : ["c/4"];
  }
  return LEVELS[difficultyEl.value];
}

// Selecciona aleatoriamente una nota del pool estricto
function getRandomNote() {
  const pool = getActivePool();
  if (pool.length === 1) return pool[0];

  const REPEAT_WEIGHT = 1;
  const NORMAL_WEIGHT = 20;

  const weightedPool = [];
  pool.forEach(note => {
    const weight = (note === lastNote) ? REPEAT_WEIGHT : NORMAL_WEIGHT;
    for (let i = 0; i < weight; i++) {
      weightedPool.push(note);
    }
  });

  const randomIndex = Math.floor(Math.random() * weightedPool.length);
  const selectedNote = weightedPool[randomIndex];
  lastNote = selectedNote;
  return selectedNote;
}

// Dibuja el pentagrama del juego actual
function drawStaff(noteKey) {
  staffContainer.innerHTML = "";

  const VF = Vex.Flow;
  const renderer = new VF.Renderer(staffContainer, VF.Renderer.Backends.SVG);
  renderer.resize(280, 180);
  const context = renderer.getContext();

  const stave = new VF.Stave(10, 30, 260);
  stave.addClef("treble");
  stave.setContext(context).draw();

  const note = new VF.StaveNote({
    keys: [noteKey],
    duration: "q",
    clef: "treble"
  });

  const octave = parseInt(noteKey.split("/")[1]);
  const noteLetter = noteKey.split("/")[0].toLowerCase();

  if (octave > 4 || (octave === 4 && noteLetter === "b")) {
    note.setStemDirection(VF.StaveNote.STEM_DOWN);
  } else {
    note.setStemDirection(VF.StaveNote.STEM_UP);
  }

  const ghostLeft = new VF.GhostNote({ duration: "q" });
  const ghostRight = new VF.GhostNote({ duration: "q" });

  const voice = new VF.Voice({ num_beats: 3, beat_value: 4 });
  voice.setStrict(false);
  voice.addTickables([ghostLeft, note, ghostRight]);

  const availableWidth = stave.getNoteEndX() - stave.getNoteStartX();
  new VF.Formatter().joinVoices([voice]).format([voice], availableWidth);

  voice.draw(context, stave);
}

// Dibuja el pentagrama de referencia y crea las casillas alineadas
function drawCustomSelector() {
  customStaffEl.innerHTML = "";
  checkboxesContainer.innerHTML = "";

  const VF = Vex.Flow;
  const renderer = new VF.Renderer(customStaffEl, VF.Renderer.Backends.SVG);
  renderer.resize(730, 160);
  const context = renderer.getContext();

  const stave = new VF.Stave(10, 20, 710);
  stave.addClef("treble");
  stave.setContext(context).draw();

  const staveNotes = ALL_NOTES.map(noteKey => {
    const octave = parseInt(noteKey.split("/")[1]);
    const noteLetter = noteKey.split("/")[0].toLowerCase();

    const note = new VF.StaveNote({
      keys: [noteKey],
      duration: "q",
      clef: "treble"
    });

    if (octave > 4 || (octave === 4 && noteLetter === "b")) {
      note.setStemDirection(VF.StaveNote.STEM_DOWN);
    } else {
      note.setStemDirection(VF.StaveNote.STEM_UP);
    }

    return note;
  });

  const voice = new VF.Voice({ num_beats: ALL_NOTES.length, beat_value: 4 });
  voice.setStrict(false);
  voice.addTickables(staveNotes);

  new VF.Formatter().joinVoices([voice]).format([voice], 700);
  voice.draw(context, stave);

  // Crear casillas alineadas perfectamente con las notas
  staveNotes.forEach((note, index) => {
    const noteKey = ALL_NOTES[index];
    const noteX = note.getAbsoluteX();

    const item = document.createElement("div");
    item.className = "note-checkbox-item";
    item.style.left = `${noteX}px`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `chk-${index}`;
    checkbox.checked = customSelectedNotes.has(noteKey);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        customSelectedNotes.add(noteKey);
      } else {
        if (customSelectedNotes.size > 1) {
          customSelectedNotes.delete(noteKey);
        } else {
          checkbox.checked = true; // Mantiene al menos 1 nota seleccionada
        }
      }
      nextRound();
    });

    const label = document.createElement("label");
    label.htmlFor = `chk-${index}`;
    label.textContent = NOTE_NAMES[index];

    item.appendChild(checkbox);
    item.appendChild(label);
    checkboxesContainer.appendChild(item);
  });
}

// Control del temporizador
function resetTimer() {
  clearTimeout(timerId);

  if (timerEnableEl.checked) {
    const duration = parseInt(timerSpeedEl.value);
    timerId = setTimeout(() => {
      feedbackEl.textContent = "Següent nota...";
      feedbackEl.style.color = "#555";
      nextRound();
    }, duration);
  }
}

function nextRound() {
  currentNote = getRandomNote();
  drawStaff(currentNote);
  resetTimer();
}

function handleKeyPress(event) {
  const key = event.key.toUpperCase();
  const validKeys = ["C", "D", "E", "F", "G", "A", "B"];

  if (!validKeys.includes(key)) return;

  const expectedKey = currentNote.split("/")[0].toUpperCase();

  if (key === expectedKey) {
    hits++;
    hitsEl.textContent = hits;
    feedbackEl.textContent = "¡Correcte!";
    feedbackEl.style.color = "#2e7d32";
  } else {
    errors++;
    errorsEl.textContent = errors;
    feedbackEl.textContent = `Incorrecte. Era ${expectedKey}`;
    feedbackEl.style.color = "#c62828";
  }

  nextRound();
}

// Event Listeners
document.addEventListener("keydown", handleKeyPress);

timerEnableEl.addEventListener("change", () => {
  timerSpeedEl.disabled = !timerEnableEl.checked;
  resetTimer();
});

timerSpeedEl.addEventListener("change", resetTimer);

difficultyEl.addEventListener("change", () => {
  hits = 0;
  errors = 0;
  hitsEl.textContent = "0";
  errorsEl.textContent = "0";

  if (difficultyEl.value === "custom") {
    customContainer.classList.remove("hidden");
    drawCustomSelector();
  } else {
    customContainer.classList.add("hidden");
  }

  feedbackEl.textContent = "Dificultat canviada. Presiona una tecla.";
  feedbackEl.style.color = "#555";
  nextRound();
});

selectAllBtn.addEventListener("click", () => {
  customSelectedNotes = new Set(ALL_NOTES);
  drawCustomSelector();
  nextRound();
});

deselectAllBtn.addEventListener("click", () => {
  customSelectedNotes = new Set(["c/4"]);
  drawCustomSelector();
  nextRound();
});

nextBtn.addEventListener("click", () => {
  feedbackEl.textContent = "Nota canviada.";
  feedbackEl.style.color = "#555";
  nextRound();
});

// Inicialización
nextRound();