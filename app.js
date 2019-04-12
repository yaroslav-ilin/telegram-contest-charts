// utils


var LONG_TAP_DURATION = 800;
var SCALE_DURATION = 400;

var MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate (date) {
  return MONTHS[date.getMonth()] + ' ' + date.getDate();
}

function createNode (parent, tag, clsName) {
  var el = document.createElement(tag);
  if (clsName) {
    el.className = clsName;
  }
  parent.appendChild(el);
  return el;
}

function createAnimation (value, duration) {
  var anim = {
    fromValue: value,
    toValue: value,
    current: value,
    startTime: 0,
    duration: duration,
    delay: 0,

    play: function (currentTime, toValue) {
        anim.startTime = currentTime;
        anim.toValue = toValue;
        anim.fromValue = anim.value;
    },

    update: function (time) {
      if (anim.current === anim.toValue) {
        return false;
      }

      var progress = Math.max(0, 
        Math.min(1,
          ((time - anim.startTime) - anim.delay) / anim.duration
        )
      );
      var ease = -progress * (progress - 2);
      anim.current = anim.fromValue + (anim.toValue - anim.fromValue) * ease;

      return true;
    }
  };
  return anim;
}

var listen = (function () {
  var supportsPassive = false;
  try {
    var opts = Object.defineProperty({}, 'passive', {
      get: function () {
        supportsPassive = true;
      }
    });
    window.addEventListener('testPassive', null, opts);
    window.removeEventListener('testPassive', null, opts);
  } catch (ignore) {}
  var passiveArgs = supportsPassive ? { passive: true } : false;

  return function listen (node, evt, callback, tryPassive) {
    node.addEventListener(evt, callback, tryPassive === true ? passiveArgs : false);
    return function () {
      node.removeEventListener(evt, callback, tryPassive === true ? passiveArgs : false);
    }
  };
}());

// components


function Checkboxes (parent, items, callback) {
  var host = createNode(parent, 'form', 'checkboxes');
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
      if (evt.cancelable) {
        evt.preventDefault();
      }
    } else {
      clearTimeout(timeout);
    }
  }

  function createCheckbox (item) {
    var view = createNode(host, 'label', 'checkbox');
    view.style.color = item[1];
    listen(view, 'mousedown', handleMouseDown);
    listen(view, 'touchstart', handleMouseDown, true);
    listen(view, 'touchend', handleMouseUp);
    listen(view, 'click', handleMouseUp);

    var inp = createNode(view, 'input');
    inp.type = 'checkbox';
    inp.checked = true;
    inp.name = item[0];
    inp.onchange = handleCheck;

    createNode(view, 'div', 'checkbox__bg');

    createNode(view, 'span', 'checkbox__checkmark');
    createNode(view, 'span', 'checkbox__label')
      .innerText = item[2];
  }

  each(createCheckbox);
}


function Popover (parent, onSelect) {
  var view = createNode(parent, 'button', 'popover button card');

  view.onclick = onSelect;
  this.setOrigin = function (x, y) {
    view.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  };
  this.setContent = function (newContent) {
    view.innerText = newContent;
  };
}


function Chart (parent, opts) {
  var view = createNode(parent, 'div', 'chart');
  var popover = new Popover(view, opts.onZoom);

  var unlisteners = [];
  var POPOVER_OFFSET = 10;
  var isFollowingCursor = false;
  var xColumn = null;
  var range = {
    start: 0,
    end: 1,
    count: 1,
    minUnit: 0,
    maxUnit: 1
  };
  var bounds = {
    max: Number.MIN_VALUE,
    min: Number.MAX_VALUE
  };
  var columns = [];

  var pixelRatio = window.devicePixelRatio;
  var width = null;
  var height = null;

  var textXWidth = 30 * pixelRatio;
  var textYHeight = 45 * pixelRatio;

  var canvas = createNode(view, 'canvas', 'chart__canvas');
  var ctx = canvas.getContext('2d');
  var canvasBounds = null;

  function setRange (start, end) {
    range = {
      start: start,
      end: end,
      count: end - start,
      width: xColumn.data[end] - xColumn.data[start]
    };
    render();
  }

  function load (newData) {
    function findXName (types) {
      for (var name in types) {
        if (types[name] === 'x') {
          return name;
        }
      }
      return null;
    }

    data = newData;
    var nameOfX = findXName(data.types);

    for (var c = 0; c < data.columns.length; c++) {
      var name = data.columns[c][0];
      var columnData = data.columns[c].slice(1);
      var column = {
          name: name,
          data: columnData,
          min: columnData[0],
          max: columnData[0],
          opacity: createAnimation(1, SCALE_DURATION)
      };

      if (name === nameOfX) {
        column.min = columnData[0];
        column.max = columnData[columnData.length - 1];
        xColumn = column;
      } else {
        for (var i = 1; i < columnData.length; i++) {
          var value = columnData[i];
          if (value < column.min) {
            column.min = value;
          } else if (value > column.max) {
            column.max = value;
          }
        }
        columns.push(column);
      }
    }

    handleResize();
    setRange(0, xColumn.data.length - 1);
  }

  function handleResize () {
    canvasBounds = canvas.getBoundingClientRect();
    var newWidth = canvasBounds.width * pixelRatio;
    var newHeight = canvasBounds.height * pixelRatio;

    if (width !== newWidth || height !== newHeight) {
      canvas.width = width = newWidth;
      canvas.height = height = newHeight;
    }
  }

  function render () {
    ctx.clearRect(0, 0, width, height);
    // TODO: on resize and filter change:
    bounds.max = Number.MIN_VALUE;
    bounds.min = Number.MAX_VALUE;
    for (var c = 0; c < columns.length; c++) {
      var column = columns[c];
      for (var i = range.start; i < range.end; i++) {
        var y = column.data[i];
        if (y < bounds.min) {
          bounds.min = y;
        }
        if (y > bounds.max) {
          bounds.max = y;
        }
      }
    }
    if (bounds.max === Number.MIN_VALUE) {
      bounds.max = 1;
    }

    var yRange = bounds.max - bounds.min;

    for (c = 0; c < columns.length; c++) {
      column = columns[c];
      ctx.lineWidth = 1 * pixelRatio;
      renderPath(column, height / yRange);
    }
  }

  function renderPath (yColumn, scaleY) {
    var scaleX = width / range.width;
    ctx.strokeStyle = data.colors[yColumn.name];

    ctx.beginPath();
    ctx.lineJoin = 'bevel';

    var firstY = yColumn.data[range.start] - bounds.min;
    ctx.moveTo(0, height - firstY * scaleY);

    var step = Math.max(1, Math.floor((range.end - range.start) / width));

    for (var i = range.start + 1; i < range.end; i += step) {
        var x = xColumn.data[i] - xColumn.data[range.start];
        var y = yColumn.data[i] - bounds.min;
        ctx.lineTo(x * scaleX, height - y * scaleY);
    }
    ctx.stroke();
  }

  function dispose () {
    for (var i = 0; i < unlisteners.length; i++) {
      unlisteners[i]();
    }
  }

  unlisteners.push(
    listen(window, 'resize', handleResize, true)
  );

  listen(canvas, 'mousedown', function (evt) {
    isFollowingCursor = true;
  }, true);
  unlisteners.push(
    listen(document, 'mousemove', function (evt) {
      if (!isFollowingCursor) {
        return;
      }
      popover.setOrigin(evt.pageX - canvasBounds.left + POPOVER_OFFSET, evt.pageY - canvasBounds.top - POPOVER_OFFSET);
    }, true)
  );
  unlisteners.push(
    listen(document, 'mouseup', function (evt) {
      isFollowingCursor = false;
    }, true)
  );

  popover.setContent('Pop Over');

  ctx.font = (10 * pixelRatio) + 'px Arial';

  this.load = load;
  this.setRange = setRange;
  this.render = render;
  this.dispose = dispose;
}


function Preview (parent, series, callback) {
  var view = createNode(parent, 'div', 'preview');

  var pan = createNode(view, 'div', 'pan');
  var panL = createNode(pan, 'div', 'pan_left');
  var panR = createNode(pan, 'div', 'pan_right');

  var needsRedraw = true;
  var left = null;
  var right = null;
  pan.style.left = '0';
  pan.style.right = '0';

  function createGesture (gesture, clientX) {
    var initialBounds = pan.getBoundingClientRect();
    if (gesture === 'left' || gesture === 'drag') {
      var offsetLeft = clientX - initialBounds.left;
    }
    if (gesture === 'right' || gesture === 'drag') {
      var offsetRight = initialBounds.left + initialBounds.width - clientX;
    }

    return function (clientX) {
      var bounds = view.getBoundingClientRect();
      if (gesture === 'left' || gesture === 'drag') {
        left = clientX - bounds.left - offsetLeft;
      }
      if (gesture === 'right' || gesture === 'drag') {
        right = window.innerWidth - clientX - bounds.left - offsetRight;
      }
      needsRedraw = true;
    };
  }

  function createMouseHandler (gesture) {
    return function (evt) {
      var move = createGesture(gesture, evt.clientX);
  
      if (gesture !== 'drag') {
        evt.stopPropagation();
      }

      var stopListeningMove = listen(document, 'mousemove', function (evt) {
        move(evt.clientX);
      });
      var stopListeningUp = listen(document, 'mouseup', function () {
        stopListeningMove();
        stopListeningUp();
      }, true);
    }
  }

  var locks = {
    pan: false,
    pan_left: false,
    pan_right: false
  };

  function createTouchHandler (gesture) {
    return function (evt) {
      if (locks.pan) {
        return;
      }
      var lock = evt.currentTarget.className;
      if (locks[lock]) {
        return;
      }

      if (gesture === 'drag' && (locks.pan_left || locks.pan_right)) {
        return;
      }
      var touch = evt.targetTouches[0];
      var touchIdx = touch.identifier;
      var move = createGesture(gesture, touch.clientX);

      evt.preventDefault();
      if (gesture === 'left' || gesture === 'right') {
        evt.stopPropagation();
      }

      locks[lock] = true;
      var stopListeningTouchMove = listen(evt.currentTarget, 'touchmove', function (evt) {
        for (var i = 0; i < evt.changedTouches.length; i++) {
          var touch = evt.changedTouches[i];
          if (touch.identifier === touchIdx) {
            move(touch.clientX);
          }
        }
      }, true);
      var stopListeningTouchEnd = listen(evt.currentTarget, 'touchend', function (evt) {
        for (var i = 0; i < evt.changedTouches.length; i++) {
          var touch = evt.changedTouches[i];
          if (touch.identifier === touchIdx) {
            stopListeningTouchEnd();
            stopListeningTouchMove();
            locks[lock] = false;
          }
        }
      }, true);
    }
  }

  listen(pan, 'mousedown', createMouseHandler('drag'), true);
  listen(panL, 'mousedown', createMouseHandler('left'), true);
  listen(panR, 'mousedown', createMouseHandler('right'), true);

  listen(pan, 'touchstart', createTouchHandler('drag'), false);
  listen(panL, 'touchstart', createTouchHandler('left'), false);
  listen(panR, 'touchstart', createTouchHandler('right'), false);

  this.render = function () {
    if (needsRedraw) {
      needsRedraw = false;

      pan.style.left = left + 'px';
      pan.style.right = right + 'px';
    }
  };

  this.dispose = function () {
    parent.removeChild(view);
  };
}


function ChartScreen (parent, data, idx) {
  var view = createNode(parent, 'article', 'screen');

  var header = createNode(view, 'header', 'header');

  var hMain = createNode(header, 'div', 'header__section header__main');
  var title = createNode(hMain, 'h1', 'header__title');
  title.innerText = 'Chart #' + String(idx + 1);
  var period1 = createNode(hMain, 'h2', 'header__period');
  period1.innerText = '1 Apr 2019 - 30 Apr 2019';

  var hDetailed = createNode(header, 'div', 'header__section header__detailed');
  var zoomButton = createNode(hDetailed, 'button', 'button zoom-out');
  zoomButton.innerText = 'Zoom Out';
  zoomButton.onclick = function () {
    view.classList.remove('screen_detailed');
  };
  var period2 = createNode(hDetailed, 'h2', 'header__period');
  period2.innerText = 'Saturday, 20 Apr 2019';

  var chart = window.chart = new Chart(view, {
    onZoom: function () {
      view.classList.add('screen_detailed');
    }
  });
  chart.load(data);

  var preview = new Preview(view, data.columns[0], chart.setRange);

  var columns = [];
  for (var i = 0; i < data.columns.length; i++) {
    var column = data.columns[i];
    var colName = column[0];
    if (colName === 'x') { continue; }
    columns.push([ colName, data.colors[colName], data.names[colName] ]);
  }
  new Checkboxes(view, columns, function (items) {
    console.log(items);
  });

  function redraw (time) {
    preview.render();

    requestAnimationFrame(redraw);
  }
  requestAnimationFrame(redraw);
}

// init


var xhr = new XMLHttpRequest();
xhr.open('GET', './datasource/1/overview.json', true);
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4 && xhr.status === 200) {
    window.json = JSON.parse(xhr.responseText);
    console.log(json);

    new ChartScreen(root, json, 0);
    // for (var i = 0; i < json.length; i++) {
    //   new ChartScreen(root, json[i], i);
    // }
  }
};
xhr.send(null);
