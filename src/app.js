// utils


var LONG_TAP_DURATION = 800;

var MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate (date) {
  return MONTHS[date.getMonth()] + ' ' + date.getDate();
}

function createNode (parent, tag, attrs) {
  attrs || (attrs = []);
  var el = document.createElement(tag);
  for (var i = 0; i < attrs.length; i++) {
    var attr = attrs[i];
    el.setAttribute(attr[0], attr[1]);
  }
  parent.appendChild(el);
  return el;
}

function listen (node, evt, callback) {
  node.addEventListener(evt, callback, false);
  return function () {
    node.removeEventListener(evt, callback, false);
  }
}

// theme


var isNightTheme = localStorage.getItem('theme') === 'night';
function setTheme (isNightTheme) {
  if (isNightTheme) {
    document.body.classList.add('night');
    btnTheme.innerText = 'Switch to Day Mode';
    localStorage.setItem('theme', 'night');
  } else {
    document.body.classList.remove('night');
    btnTheme.innerText = 'Switch to Night Mode';
    localStorage.removeItem('theme');
  }
}
setTheme(isNightTheme);

// components


function Checkboxes (parent, items, callback) {
  var host = createNode(parent, 'form', [ ['class', 'checkboxes'] ]);
  var timeout = null;

  function each (cb) {
    for (var i = 0; i < items.length; i++) {
      cb(items[i]);
    }
  }

  function handleCheck () {
    callback(host.elements);
  }

  function handleMouseDown (evt) {
    var colName = evt.currentTarget.getElementsByTagName('input')[0].name;
    timeout = setTimeout(function () {
      timeout = null;
      each(function (item) {
        host.elements[item[0]].checked = item[0] === colName;
      });
      handleCheck();
    }, LONG_TAP_DURATION);
  }
  function handleMouseUp (evt) {
    if (timeout === null) {
      evt.preventDefault();
    } else {
      clearTimeout(timeout);
    }
  }

  function createCheckbox (item) {
    var view = createNode(host, 'label', [ ['class', 'checkbox'] ]);
    listen(view, 'mousedown', handleMouseDown);
    listen(view, 'touchstart', handleMouseDown);
    listen(view, 'touchend', handleMouseUp);
    listen(view, 'click', handleMouseUp);

    // <input type="checkbox" checked="checked" name="{name}" />
    listen(createNode(view, 'input', [ 
      ['type', 'checkbox'], ['checked', 'checked'], ['name', item[0]]
    ]), 'change', handleCheck);

    // <span class="checkbox__checkmark" style="color: {color}"></span>
    createNode(view, 'span', [
      ['class', 'checkbox__checkmark'], ['style', 'color: ' + item[1]],
    ]);
    // <span class="checkbox__label">{name}</span>
    createNode(view, 'span', [ ['class', 'checkbox__label'] ]).innerText = item[2];
  }

  each(createCheckbox);
}


function Chart (parent, data) {
  var view = createNode(parent, 'div', [ ['class', 'chart'] ]);
}


function Preview (parent, data) {
  var view = createNode(parent, 'div', [ ['class', 'preview'] ]);

  var pan = createNode(view, 'div', [ ['class', 'pan'] ]);
  createNode(pan, 'div', [ ['class', 'pan_left'] ]);
  createNode(pan, 'div', [ ['class', 'pan_right'] ]);
}


function ChartScreen (parent, data) {
  var view = createNode(parent, 'article', [ ['class', 'screen'] ]);

  new Chart(view, data);

  new Preview(view, data);

  var checkboxesData = [];
  for (var i = 0; i < data.columns.length; i++) {
    var column = data.columns[i];
    var colName = column[0];
    if (colName === 'x') { continue; }
    checkboxesData.push([ colName, data.colors[colName], data.names[colName] ]);
  }
  new Checkboxes(view, checkboxesData, console.log);
}

// init


var xhr = new XMLHttpRequest();
xhr.open('GET', './chart_data.json', true);
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4 && xhr.status === 200) {
    window.json = JSON.parse(xhr.responseText);
    console.log(json);

    for (var i = 0; i < json.length; i++) {
      new ChartScreen(root, json[i]);
    }
  }
};
xhr.send(null);
