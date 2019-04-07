// utils


var LONG_TAP_DURATION = 800;

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


function Popover (parent) {
  var view = createNode(parent, 'button', 'popover button card');

  this.setOrigin = function (x, y) {
    view.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  };
  this.setContent = function (newContent) {
    view.innerText = newContent;
  };
}


function Chart (parent, data) {
  var view = createNode(parent, 'div', 'chart');
  var popover = new Popover(view);

  popover.setContent('POPOVER');

  view.onmousemove = function (evt) {
    var obj = evt.currentTarget;
    var left = 0;
    var top = 0;
    while (obj.offsetParent) {
      left += obj.offsetLeft;
      top += obj.offsetTop;
      obj = obj.offsetParent;
    }
    popover.setOrigin(evt.pageX - left, evt.pageY - top);
  }

  this.view = view;
}


function Preview (parent, axis) {
  var view = createNode(parent, 'div', 'preview');

  var pan = createNode(view, 'div', 'pan');
  var panL = createNode(pan, 'div', 'pan_left');
  var panR = createNode(pan, 'div', 'pan_right');

  var panning = null;
  var zoomingL = null;
  var zoomingR = null;

  var minSize = 10;
  var offsetLeft = 50;
  var offsetRight = 30;

  function invalidate () {
    var size = 100 - offsetLeft - offsetRight;
    pan.style.left = offsetLeft + '%';
    pan.style.width = size + '%';
  }

  function createGesture (capturedPageX, totalWidth) {
    return function (fn, extra) {
      return function (pageX) {
        var deltaX = pageX - capturedPageX;
        var deltaPercent = deltaX / totalWidth * 100;

        fn.call(this, deltaPercent, extra);

        invalidate();
      };
    };
  }

  function setLeft (delta, capturedLeft) {
    offsetLeft = Math.max(
      0,
      Math.min(
        100 - offsetRight - minSize,
        capturedLeft + delta
      )
    );
  }
  function setRight (delta, capturedRight) {
    offsetRight = Math.max(
      0,
      Math.min(
        100 - offsetLeft - minSize,
        capturedRight - delta
      )
    );
  }
  function setLeftAndRight (delta, captured) {
    var capturedLeft = captured[0];
    var capturedSize = captured[1];

    var capturedRight = 100 - capturedLeft - capturedSize;
    var limitedDelta = Math.max(
      -capturedLeft,
      Math.min(
        delta,
        capturedRight
      )
    );

    setLeft(limitedDelta, capturedLeft);
    setRight(limitedDelta, capturedRight);
  }

  pan.onmousedown = function (evt) {
    if (!zoomingL && !zoomingR) {
      var gesture = createGesture(evt.pageX, view.getBoundingClientRect().width);
      panning = gesture(
        setLeftAndRight,
        [ offsetLeft, 100 - offsetLeft - offsetRight ]
      );
    }
  };
  listen(pan, 'touchstart', function (evt) {
    if (!zoomingL && !zoomingR) {
      var gesture = createGesture(evt.changedTouches[0].pageX, view.getBoundingClientRect().width);
      panning = gesture(
        setLeftAndRight,
        [ offsetLeft, 100 - offsetLeft - offsetRight ]
      );
    }
  }, true);
  panL.onmousedown = function (evt) {
    evt.stopPropagation();
    if (!panning) {
      var gesture = createGesture(evt.pageX, view.getBoundingClientRect().width);
      zoomingL = gesture(setLeft, offsetLeft);
    }
  };
  listen(panL, 'touchstart', function (evt) {
    evt.stopPropagation();
    if (!panning) {
      var gesture = createGesture(evt.changedTouches[0].pageX, view.getBoundingClientRect().width);
      zoomingL = gesture(setLeft, offsetLeft);
    }
  }, true);
  panR.onmousedown = function (evt) {
    evt.stopPropagation();
    if (!panning) {
      var gesture = createGesture(evt.pageX, view.getBoundingClientRect().width);
      zoomingR = gesture(setRight, offsetRight);
    }
  };
  listen(panR, 'touchstart', function (evt) {
    evt.stopPropagation();
    if (!panning) {
      var gesture = createGesture(evt.changedTouches[0].pageX, view.getBoundingClientRect().width);
      zoomingR = gesture(setRight, offsetRight);
    }
  }, true);

  var unlistenMove = listen(document, 'mousemove', function (evt) {
    if (panning) {
      panning(evt.pageX);
      evt.preventDefault();
    }
    if (zoomingL) {
      zoomingL(evt.pageX);
      evt.preventDefault();
    }
    if (zoomingR) {
      zoomingR(evt.pageX);
      evt.preventDefault();
    }
  });
  pan.ontouchmove = function (evt) {
    if (panning) {
      panning(evt.changedTouches[0].pageX);
      evt.preventDefault();
    }
  };
  panL.ontouchmove = function (evt) {
    if (zoomingL) {
      zoomingL(evt.changedTouches[0].pageX);
      evt.preventDefault();
    }
  };
  panR.ontouchmove = function (evt) {
    if (zoomingR) {
      zoomingR(evt.changedTouches[0].pageX);
      evt.preventDefault();
    }
  };

  var unlistenUp = listen(document, 'mouseup', function (evt) {
    panning = null;
    zoomingL = null;
    zoomingR = null;
  }, true);
  listen(pan, 'touchend', function (evt) {
    panning = null;
  }, true);
  listen(panL, 'touchend', function (evt) {
    evt.stopPropagation();
    zoomingL = null;
  }, true);
  listen(panR, 'touchend', function (evt) {
    evt.stopPropagation();
    zoomingR = null;
  }, true);

  invalidate();

  this.dispose = function () {
    unlistenUp();
    unlistenMove();
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

  var chart = new Chart(view, data);

  chart.view.onclick = function () {
    view.classList.add('screen_detailed');
  };

  new Preview(view, data.columns[0].slice(1));

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
}

// init


var xhr = new XMLHttpRequest();
xhr.open('GET', './chart_data.json', true);
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4 && xhr.status === 200) {
    window.json = JSON.parse(xhr.responseText);
    console.log(json);

    for (var i = 0; i < json.length; i++) {
      new ChartScreen(root, json[i], i);
    }
  }
};
xhr.send(null);
