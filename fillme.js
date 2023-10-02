var wl = [];
var rows = [];
var puzzle = null;
var now_utc = new Date();
var yday_utc = new Date(now_utc.getTime() - 24 * 60 * 60 * 1000);
var start_time = now_utc.getTime();
var todays_utc_date =
  now_utc.getUTCFullYear() +
  "-" +
  (now_utc.getUTCMonth() + 1) +
  "-" +
  now_utc.getUTCDate();
var yesterdays_utc_date =
  yday_utc.getUTCFullYear() +
  "-" +
  (yday_utc.getUTCMonth() + 1) +
  "-" +
  yday_utc.getUTCDate();
var who =
  localStorage.getItem("who") ||
  Date.now() + "-" + Math.floor(Math.random() * (1 << 24));
var puzzle_id = localStorage.getItem("puzzle_id") || "1";

var AKSHAR_AADHA = 0;
var AKSHAR_POORA = 1;
var AKSHAR_MATRA = 2;
function classify_akshar(word, i) {
  var cc = word.charCodeAt(i);
  if (cc >= 0x0900 && cc <= 0x0903) return AKSHAR_MATRA;
  if (cc >= 0x093a && cc <= 0x0957) return AKSHAR_MATRA;
  if (i == word.length - 1) return AKSHAR_POORA;
  if (word.charCodeAt(i + 1) == 0x094d) return AKSHAR_AADHA;
  return AKSHAR_POORA;
}

var key_map = {}; // maps akshars to <span> elements
function make_keyboard() {
  var keyboard = document.getElementById("keyboard");
  var c_fst = 0x0905;
  var c_end = 0x0939 + 1;
  var k = 0;
  for (var i = 0; i < c_end - c_fst; i++) {
    // Skip some akshars such as ऌ, ऍ
    if (
      [0x090c, 0x090d, 0x090e, 0x0912, 0x0929, 0x0931, 0x0933, 0x0934].indexOf(
        c_fst + i
      ) !== -1
    )
      continue;
    k++;
    // Add a line break after vowels and consonant groups
    if (k == 7 || k == 13 || (k > 13 && k < 42 && (k - 13) % 5 == 0) || k == 42)
      keyboard.appendChild(document.createElement("br"));

    var key = document.createElement("span");
    key.textContent = String.fromCharCode(c_fst + i);
    key_map[key.textContent] = key;
    key.addEventListener("click", function (e) {
      var row = rows[rows.length - 1];
      for (var j = 0; j < row.length; j++)
        if (row[j].dataset.guess == "") break;
      row[j].dataset.guess = e.target.textContent;
      render_rows();
    });
    keyboard.appendChild(key);
  }
  // Add backspace
  keyboard.appendChild(document.createElement("br"));
  var backspace = document.createElement("span");
  backspace.id = "delete";
  backspace.textContent = "←";
  backspace.addEventListener("click", function (e) {
    var row = rows[rows.length - 1];
    for (var j = 0; j < row.length; j++) if (row[j].dataset.guess == "") break;
    if (j > 0 && j !== row.length) row[j - 1].dataset.guess = "";
    render_rows();
  });
  keyboard.appendChild(backspace);
}

// Add a new row to the grid
function add_row() {
  var tr = document.createElement("tr");
  var row = [];
  for (var i = 0; i < puzzle.length; i++) {
    var td = document.createElement("td");
    td.dataset.guess = "";
    tr.appendChild(td);
    row.push(td);
  }
  document.getElementById("grid").appendChild(tr);
  rows.push(row);
  render_rows();
}

// Remove row if it has incorrect entry
function remove_invalid_row() {
  const grid = document.getElementById("grid");
  grid.removeChild(grid.lastElementChild);
}

function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      //console.log("wait over");
      resolve(ms);
    }, ms);
  });
}

async function score_row(row) {
  var guess = "";
  for (var i = 0; i < row.length; i++) {
    guess += puzzle[i].pre + row[i].dataset.guess + puzzle[i].post;
  }
  dataLayer.push({ event: "attempt" });
  dataLayer.push({ guess: guess });

  if (wl.indexOf(guess) == -1) {
    for (var i = 0; i < row.length; i++) {
      row[i].className = "galat-hai";
    }
    await wait(2000);
    remove_invalid_row();
    add_row();
    return;
  }

  var win = true;
  var total_count = {}; // number of "unclaimed" letters
  for (var i = 0; i < puzzle.length; i++) {
    if (!Object.hasOwnProperty(total_count, puzzle[i].mid))
      total_count[puzzle[i].mid] = 0;
    if (row[i].dataset.guess != puzzle[i].mid) total_count[puzzle[i].mid]++;
  }
  for (var i = 0; i < row.length; i++) {
    if (row[i].dataset.guess == puzzle[i].mid) {
      row[i].className = "good";
      key_map[row[i].dataset.guess].className = "good";
    } else {
      win = false;
      row[i].className = "bad";
      if (total_count[row[i].dataset.guess] > 0) {
        row[i].className = "okay";
        total_count[row[i].dataset.guess]--;
        if (key_map[row[i].dataset.guess].className == "")
          key_map[row[i].dataset.guess].className = "okay";
      }
      if (
        !Object.hasOwnProperty(total_count, row[i].dataset.guess) &&
        key_map[row[i].dataset.guess].className == ""
      ) {
        key_map[row[i].dataset.guess].className = "bad";
      }
    }
  }
  if (win) {
    for (var i = 0; i < row.length; i++) {
      row[i].className = "good jeet";
    }
    dataLayer.push({ event: "jeet" });
    make_share();
  } else add_row();
}

function render_rows() {
  for (var i = 0; i < rows.length; i++) render_row(rows[i], puzzle);
  var row = rows[rows.length - 1];
  var all_guessed = true;
  for (var i = 0; i < row.length; i++)
    if (row[i].dataset.guess == "") all_guessed = false;
  if (all_guessed) score_row(row);
}

function render_row(row, puzzle) {
  for (var i = 0; i < puzzle.length; i++) {
    var out = "";
    if (/*puzzle[i].post == '' && */ row[i].dataset.guess == "") {
      out = puzzle[i].pre + dotted_circle + puzzle[i].post;
    } else {
      out = puzzle[i].pre + row[i].dataset.guess + puzzle[i].post;
    }
    row[i].textContent = out;
  }
}

function make_share() {
  var end_time = new Date().getTime();
  var time_taken = end_time - start_time;
  var time_taken_str = "";
  todays_clue = [];
  if (time_taken < 20000) {
    time_taken_str = "Instantaneous!";
  } else if (time_taken < 120000) {
    time_taken_str = parseInt(time_taken / 1000).toString() + " seconds";
  } else if (time_taken < 7200000) {
    time_taken_str = parseInt(time_taken / 60000).toString() + " minutes";
  } else {
    time_taken_str = parseInt(time_taken / 3600000).toString() + " hours";
  }

  for (var i = 0; i < puzzle.length; i++) {
    todays_clue[i] = puzzle[i].pre + dotted_circle + puzzle[i].post;
  }
  var clue = todays_clue.join("-");

  var out =
    '<p id="result-text" class="language-css"><b>फ़िल्मी ' +
    todays_utc_date +
    " </b><br><br>";
  if (rows.length == 1) {
    out += "💯 Whoa! Solved in <b>first try</b>! ";
  } else {
    out += "👍🏽 Solved in <b>" + rows.length.toString() + " attempts</b>! ";
  }
  out += "🕓 <b>" + time_taken_str + "</b><br>";
  out += "<br>Play at https://giitaayan.com/fillme </p>";

  var share = document.getElementById("share");
  share.innerHTML = out;
  document.getElementById("share-area").style.display = "block";
  document.getElementById("keyboard").style.display = "none";
  var hours_left = 23 - new Date().getUTCHours();
  var minutes_left = 59 - new Date().getUTCMinutes();
  if (minutes_left < 2) {
    var minute_label = "minute";
  } else {
    var minute_label = "minutes";
  }
  document.getElementById("countdown").textContent =
    hours_left + " hours and " + minutes_left + " " + minute_label;
}

async function initializePuzzles() {
  try {
    const puzzlesResponse = await fetch('puzzles.txt');
    const puzzlesData = await puzzlesResponse.text();
    const puzzles = {};
    const lines = puzzlesData.split('\n');
    for (const line of lines) {
      const [date, puzzle] = line.split(':');
      puzzles[date.trim()] = puzzle.trim();
    }
    return puzzles;
  } catch (error) {
    console.error('Error:', error);
  }
}

window.addEventListener('load', async function() {
    make_keyboard();
    const puzzles = await initializePuzzles(); 
    
    // Fetch namelist 
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "films.txt");
    // xhr.open("GET", "https://v9y.github.io/fillme/films.txt");
    xhr.onload = function (x) {
      // Split the namelist into an array and store in wl
      wl = this.responseText.split("\n");
      var word = puzzles[todays_utc_date];
      // console.log(word);
      var yesterdays_word = puzzles[yesterdays_utc_date];
      document.getElementById("lastword_value").textContent = yesterdays_word;
      
      // Form the puzzle 
      puzzle = [];
      
      var row = [];
      var needs_new = false;
      for (var i = 0; i < word.length; i++) {
        var c = classify_akshar(word, i);

        if (i == 0 || (c != AKSHAR_MATRA && needs_new)) {
          if (classify_akshar(word, i - 1) == AKSHAR_POORA)
            row[row.length - 1] += dotted_circle;
          row.push("");
          puzzle.push({ pre: "", post: "", mid: "" });
        }
        if (c == AKSHAR_MATRA) {
          row[row.length - 1] += word.charAt(i);
          if (word.charCodeAt(i) == 0x094d)
            puzzle[puzzle.length - 1].pre += word.charAt(i);
          else puzzle[puzzle.length - 1].post += word.charAt(i);
        }
        if (c == AKSHAR_AADHA) {
          row[row.length - 1] += word.charAt(i);
          puzzle[puzzle.length - 1].pre += word.charAt(i);
        }
        if (c == AKSHAR_POORA) {
          puzzle[puzzle.length - 1].mid = word.charAt(i);
        }

        if (
          c == AKSHAR_POORA ||
          (c == AKSHAR_MATRA && word.charCodeAt(i) != 0x094d)
        )
          needs_new = true;
        else needs_new = false;
      }
      add_row(); // add first row
    };
    // Send the request
    xhr.send(null); 
  },
  false
);
var dotted_circle = "\u25cc"; 
