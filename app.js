// config


var LONG_TAP_DURATION = 800;
var SCALE_DURATION = 400;
var TEXT_X_FADE_DURATION = 200;

// utils


var MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

var animator = {
  currentTime: 0,

  createAnimation: function (value, duration) {
    var anim = {
      fromValue: value,
      toValue: value,
      current: value,
      startTime: 0,
      duration: duration,
      delay: 0,
  
      play: function (toValue) {
          anim.startTime = animator.currentTime;
          anim.toValue = toValue;
          anim.fromValue = anim.current;
      },
  
      update: function () {
        if (anim.current === anim.toValue) {
          return false;
        }
  
        var progress = Math.max(0, 
          Math.min(1,
            ((animator.currentTime - anim.startTime) - anim.delay) / anim.duration
          )
        );
        var ease = -progress * (progress - 2);
        anim.current = anim.fromValue + (anim.toValue - anim.fromValue) * ease;
  
        return true;
      }
    };
    return anim;
  }
};

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


function createCheckboxes (parent, callback) {
  var items = null;

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
    var columnId = evt.currentTarget.getElementsByTagName('input')[0].name;
    timeout = setTimeout(function () {
      timeout = null;
      each(function (item) {
        host.elements[item.id].checked = item.id === columnId;
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
    view.style.color = item.color;
    listen(view, 'mousedown', handleMouseDown);
    listen(view, 'touchstart', handleMouseDown, true);
    listen(view, 'touchend', handleMouseUp);
    listen(view, 'click', handleMouseUp);

    var inp = createNode(view, 'input');
    inp.type = 'checkbox';
    inp.checked = true;
    inp.name = item.id;
    inp.onchange = handleCheck;

    createNode(view, 'div', 'checkbox__bg');

    createNode(view, 'span', 'checkbox__checkmark');
    createNode(view, 'span', 'checkbox__label')
      .innerText = item.name;
  }

  return {
    load: function (newItems) {
      items = newItems;
      each(createCheckbox);
    }
  };
}


function createPopover (parent, onSelect) {
  var view = createNode(parent, 'button', 'popover button card');
  view.style.display = 'none';

  view.onclick = onSelect;
  function setOrigin (x, y) {
    view.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  }
  function setContent (newContent) {
    view.innerText = newContent;
  }

  return {
    setOrigin: setOrigin,
    setContent: setContent
  };
}


function createChart (parent, opts) {
  var invalidated = true;
  var unlisteners = [];

  var xColumn = null;
  var columns = [];
  var settings = null;

  var view = createNode(parent, 'div', opts.classPrefix);

  var rangeX = {
    percentFrom: 0,
    percentTo: 100,
    idxFrom: 0,
    idxTo: 1,
    count: 1
  };

  var rangeY = {
    localMin: animator.createAnimation(0, SCALE_DURATION),
    localMax: 0,
    height: animator.createAnimation(0, SCALE_DURATION)
  };

  var pixelRatio = window.devicePixelRatio;
  var w = null;
  var h = null;

  var canvas = createNode(view, 'canvas', opts.classPrefix + '__canvas');
  var ctx = canvas.getContext('2d');

  var colors = null;
  var axes = createAxesRender(ctx, pixelRatio);

  function handleResize () {
    var canvasRect = canvas.getBoundingClientRect();
    var newWidth = canvasRect.width * pixelRatio;
    var newHeight = canvasRect.height * pixelRatio;

    if (w !== newWidth || h !== newHeight) {
      canvas.width = w = newWidth;
      canvas.height = h = newHeight;

      axes.setSize(w, h);

      invalidated = true;
    }
  }

  function updateComputedRange () {
    var total = xColumn.data.length - 1;
    var start = Math.floor(total / 100 * rangeX.percentFrom);
    var end = Math.round(total / 100 * rangeX.percentTo);

    rangeX.idxFrom = start;
    rangeX.idxTo = end;
    rangeX.interval = xColumn.data[1] - xColumn.data[0];
    rangeX.count = end - start;
    rangeX.width = xColumn.data[end] - xColumn.data[start];

    for (var c = 0; c < columns.length; c++) {
      var column = columns[c];
      var data = column.data;
      column.localMin = Number.MAX_VALUE;
      column.localMax = Number.MIN_VALUE;
      for (var i = start; i <= end; i++) {
        var y = data[i];
        if (y < column.localMin) {
          column.localMin = y;
        }
        if (y > column.localMax) {
          column.localMax = y;
        }
      }
    }

    var localMin = Number.MAX_VALUE;
    rangeY.localMax = Number.MIN_VALUE;
    for (var c = 0; c < columns.length; c++) {
      var column = columns[c];
      if (column.opacity.toValue === 0) {
        continue;
      }
      if (column.localMin < localMin) {
        localMin = column.localMin;
      }
      if (column.localMax > rangeY.localMax) {
        rangeY.localMax = column.localMax;
      }
    }
    if (rangeY.localMax === Number.MIN_VALUE) {
      rangeY.localMax = 1;
    }
    rangeY.localMin.play(localMin);
    rangeY.height.play(rangeY.localMax - localMin);

    invalidated = true;
  }

  function render () {
    axes.updateAnimations();
    updateAnimations();

    if (!invalidated) {
      return;
    }
    invalidated = false;

    ctx.clearRect(0, 0, w, h);

    axes.drawGrid(colors.gridLines);

    for (c = 0; c < columns.length; c++) {
      ctx.lineWidth = 1 * pixelRatio;
      drawPath(columns[c]);
    }

    ctx.font = (10 * pixelRatio) + 'px Arial';
    axes.drawText(xColumn, columns[0], null);
  }

  function updateAnimations () {
    for (var c = 0; c < columns.length; c++) {
      var column = columns[c];
      if (column.opacity.update()) {
        invalidated = true;
      }
    }

    if (rangeY.localMin.update()) {
      invalidated = true;
    }
    if (rangeY.height.update()) {
      invalidated = true;
    }
  }

  function drawPath (yColumn) {
    var scaleY = h / rangeY.height.current;
    var scaleX = w / rangeX.width;

    ctx.globalAlpha = yColumn.opacity.current;
    ctx.strokeStyle = yColumn.color;

    ctx.beginPath();
    ctx.lineJoin = 'bevel';

    var firstY = yColumn.data[rangeX.idxFrom] - rangeY.localMin.current;
    ctx.moveTo(0, h - firstY * scaleY);

    var step = Math.max(1, Math.floor((rangeX.idxTo - rangeX.idxFrom) / w));

    for (var i = rangeX.idxFrom; i <= rangeX.idxTo; i += step) {
        var x = xColumn.data[i] - xColumn.data[rangeX.idxFrom];
        var y = yColumn.data[i] - rangeY.localMin.current;
        ctx.lineTo(x * scaleX, h - y * scaleY);
    }
    ctx.stroke();
  }

  function createAxesRender () {
    var text = {
      width: 30 * pixelRatio,
      verticalDistance: 60 * pixelRatio,
      marginY: -6 * pixelRatio,
      marginX: 16 * pixelRatio,
      countX: 6,
      countY: 5
    };

    var yTextOld = { delta: 1, opacity: animator.createAnimation(0, SCALE_DURATION) };
    var yTextNew = { delta: 1, opacity: animator.createAnimation(0, SCALE_DURATION) };

    function drawLines (yText) {
      var verticalStep = h / text.countY;

      // TODO
      ctx.globalAlpha = yText.opacity;
      for (var i = 0; i < text.countY; i++) {
        var y = i * verticalStep;
        ctx.beginPath();
        ctx.moveTo(0, h - y - pixelRatio);
        ctx.lineTo(w, h - y - pixelRatio);
        ctx.stroke();
      }
    }

    return {
      updateAnimations: function () {
        if (yTextOld.opacity.update()) {
          invalidated = true;
        }
        if (yTextNew.opacity.update()) {
          invalidated = true;
        }
      },
  
      setSize: function () {
        text.countX = Math.max(1, Math.floor(w / (text.width * 2)));
        text.countY = Math.max(1, Math.floor(h / text.verticalDistance));
      },

      drawGrid: function (color) {
        ctx.lineWidth = 1 * pixelRatio;
        ctx.strokeStyle = color;

        drawLines(yTextNew);
      },

      drawText: function (xColumn, yColumnLeft, yColumnRight) {
        if (yColumnLeft) {
          var rangeY = yColumnLeft.localMax - yColumnLeft.localMin;
          var delta = Math.floor(rangeY / text.countY);
          var step = Math.floor(h / text.countY);

          ctx.globalAlpha = 1;
          ctx.fillStyle = '#546778';
          for (var i = 0; i < text.countY; i++) {
            var value = delta * (i + 1);
            var y = h - step * i;
            ctx.fillText(value, 0, y + text.marginY);
          }
        }
      }
    };
  }

  unlisteners.push(
    listen(window, 'resize', handleResize, true)
  );

  listen(canvas, 'mousedown', function (evt) {
    isFollowingCursor = true;
  }, true);
  unlisteners.push(
    listen(document, 'mouseup', function (evt) {
      isFollowingCursor = false;
    }, true)
  );

  return {
    render: render,

    load: function (newColumnX, newColumns, newSettings) {
      xColumn = Object.create(newColumnX);
      xColumn.localMin = xColumn.min;
      xColumn.localMax = xColumn.max;

      columns = newColumns.map(function (col) {
        var c = Object.create(col);
        c.localMin = c.min;
        c.localMax = c.max;
        c.opacity = animator.createAnimation(1, SCALE_DURATION);
        return c;
      });
      settings = Object.create(newSettings);

      handleResize();
      updateComputedRange();
    },

    setThemeColors: function (theme) {
      colors = theme;

      invalidated = true;
    },

    zoomRange: function (percentFrom, percentTo) {
      rangeX.percentFrom = percentFrom;
      rangeX.percentTo = percentTo;

      updateComputedRange();
    },

    toggleLines: function (conf) {
      for (var c = 0; c < columns.length; c++) {
        var column = columns[c];
        column.opacity.play(conf[column.id].checked ? 1 : 0);
      }

      updateComputedRange();
    },

    dispose: function () {
      for (var i = 0; i < unlisteners.length; i++) {
        unlisteners[i]();
      }
    }
  };
}


function createSlider (parent, opts) {
  var MIN_WIDTH = 40;  // px

  var invalidated = true;
  var left = 0;
  var right = 0;

  var view = createNode(parent, 'div', 'slider');

  if (opts.setup) {
    opts.setup(view);
  }

  var pan = createNode(view, 'div', 'pan');
  var panL = createNode(pan, 'div', 'pan_left');
  var panR = createNode(pan, 'div', 'pan_right');

  function createGesture (gesture, clientX) {
    var initialBounds = pan.getBoundingClientRect();
    if (gesture === 'left' || gesture === 'drag') {
      var offsetLeft = clientX - initialBounds.left;
    }
    if (gesture === 'right' || gesture === 'drag') {
      var offsetRight = initialBounds.left + initialBounds.width - clientX;
    }

    return function (clientX) {
      // TODO: rubber bounce back effect once the slider is
      //       released after getting dragged beyond the edge
      var bounds = view.getBoundingClientRect();
      if (gesture === 'left' || gesture === 'drag') {
        var maxLeft = bounds.width - right -
          (gesture === 'left' ? MIN_WIDTH : initialBounds.width);
        left = Math.max(0,
          Math.min(maxLeft, clientX - bounds.left - offsetLeft)
        );
      }
      if (gesture === 'right' || gesture === 'drag') {
        var maxRight = bounds.width - left -
          (gesture === 'right' ? MIN_WIDTH : initialBounds.width);
        right = Math.max(0,
          Math.min(maxRight, window.innerWidth - clientX - bounds.left - offsetRight)
        );
      }
      invalidated = true;

      var startPercent = 100 / bounds.width * left;
      var endPercent = 100 / bounds.width * (bounds.width - right);
      opts.onChange(startPercent, endPercent);
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

  return {
    move: function (l, r) {
      invalidated = false;

      pan.style.left = l;
      pan.style.right = r;
    },

    render: function () {
      if (invalidated) {
        invalidated = false;

        pan.style.left = left + 'px';
        pan.style.right = right + 'px';
      }
    },

    dispose: function () {
      parent.removeChild(view);
    }
  };
}

function createChartScreen (parent, name) {
  var settings = {
    yScaled: false,
    percentage: false,
    stacked: false,
  };
  var xColumn = null;
  var columns = null;

  var view = createNode(parent, 'article', 'screen');

  var header = createNode(view, 'header', 'header');

  var hMain = createNode(header, 'div', 'header__section header__main');
  var title = createNode(hMain, 'h1', 'header__title');
  title.innerText = name;
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

  function redraw (time) {
    animator.currentTime = time;

    if (isThemeChanged) {
      chart.setThemeColors(isNightTheme ? NIGHT_COLORS : DAY_COLORS);
      preview.setThemeColors(isNightTheme ? NIGHT_COLORS : DAY_COLORS);
      isThemeChanged = false;
    }
    chart.render();
    preview.render();
    slider.render();

    requestAnimationFrame(redraw);
  }

  function parseInput (data) {
    function findIdOfX (types) {
      for (var id in types) {
        if (types[id] === 'x') {
          return id;
        }
      }
      return null;
    }

    settings.yScaled = data.y_scaled || false;
    settings.percentage = data.percentage || false;
    settings.stacked = data.stacked || false;

    var idOfX = findIdOfX(data.types);

    columns = [];
    for (var c = 0; c < data.columns.length; c++) {
      var id = data.columns[c][0];
      var columnData = data.columns[c].slice(1);
      var min = columnData[0];
      var max = columnData[0];

      if (id === idOfX) {
        xColumn = {
          id: id,
          data: columnData,
          min: min,
          max: columnData[columnData.length - 1]
        };
      } else {
        for (var i = 0; i < columnData.length; i++) {
          var value = columnData[i];
          if (value < min) {
            min = value;
          } else if (value > max) {
            max = value;
          }
        }
        columns.push({
          id: id,
          type: data.types[id],
          name: data.names[id],
          color: data.colors[id],
          data: columnData,
          min: min,
          max: max
        });
      }
    }
  }

  var chart = createChart(view, {
    classPrefix: 'chart',

    onZoom: function () {
      // view.classList.add('screen_detailed');
    }
  });

  var preview = null;
  var slider = createSlider(view, {
    onChange: chart.zoomRange,

    setup: function (view) {
      preview = createChart(view, { classPrefix: 'preview' });
    }
  });

  var checkboxes = createCheckboxes(view, function (conf) {
    chart.toggleLines(conf);
    preview.toggleLines(conf);
  });

  requestAnimationFrame(redraw);

  return {
    load: function (url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          parseInput(JSON.parse(xhr.responseText));

          chart.load(xColumn, columns, settings);
          chart.zoomRange(90, 100);
          preview.load(xColumn, columns, settings);
          slider.move('90%', '0');
          checkboxes.load(columns);
        }
      };
      xhr.send(null);
    }
  };
}
