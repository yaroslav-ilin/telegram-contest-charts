const chartZoomerTemplate = document.getElementById('chart-zoomer-template').innerHTML;

function ChartZoomerView (presenter, chart) {
  if (!(this instanceof ChartZoomerView)) {
    return new ChartZoomerView(presenter, chart);
  }
  this._presenter = presenter;
  this._chart = chart;

  const host = this.host = document.createElement('div');
  host.className = 'chart-zoomer';
  host.innerHTML = template(chartZoomerTemplate);
  host.insertBefore(this._chart.host, host.firstChild);

  this.pan = host.querySelector('.chart-zoomer__pan');

  this.idxStart = 0;
  this.idxEnd = 0;

  this._minSize = 0;
  this._offsetLeft = 0;
  this._offsetRight = 0;

  this._aquiredLocks = {
    'chart-zoomer__pan': false,
    'chart-zoomer__pan-left-ruler': false,
    'chart-zoomer__pan-right-ruler': false,
  };

  this._touchPoints = {};

  this._addPassiveListener(host, 'touchstart', (evt) => {
    for (let i = 0; i < evt.changedTouches.length; i++) {
      const touch = evt.changedTouches[i];

      if (!(touch.target.className in this._aquiredLocks)) {
        continue;
      }
      if (this._aquiredLocks[touch.target.className]) {
        continue;
      }

      this._handleResizeStart(touch);

      this._aquiredLocks[touch.target.className] = true;
    }
  });
  this._addPassiveListener(host, 'mousedown', (evt) => {
    this._handleResizeStart({
      identifier: '-1',
      target: evt.target,
      pageX: evt.pageX,
    });
  });

  host.ontouchmove = (evt) => {
    let isSizeChanged = false;

    for (let i = 0; i < evt.changedTouches.length; i++) {
      const touch = evt.changedTouches[i];

      if (!(touch.identifier in this._touchPoints)) {
        continue;
      }

      const touchPoint = this._touchPoints[touch.identifier];
      touchPoint(touch.pageX);

      isSizeChanged = true;
    }

    if (isSizeChanged) {
      evt.preventDefault();
    }
  };
  document.addEventListener('mousemove', (evt) => {
    const touchPoint = this._touchPoints['-1'];

    if (touchPoint) {
      evt.preventDefault();
      touchPoint(evt.pageX);
    }
  }, false);

  this._addPassiveListener(host, 'touchend', (evt) => {
    for (let i = 0; i < evt.changedTouches.length; i++) {
      const touch = evt.changedTouches[i];

      if (delete this._touchPoints[touch.identifier]) {
        this._aquiredLocks[touch.target.className] = false;
      };
    }
  });
  document.addEventListener('mouseup', (evt) => {
    delete this._touchPoints['-1'];
  }, false);
}

ChartZoomerView.prototype.render = function () {
  this._minSize = Math.min(this._presenter.axis.length, 20) / this._presenter.axis.length * 100;
  this._chart.render();
};

ChartZoomerView.prototype.handleAttach = function () {
  this._offsetLeft = 100 - this._minSize;
  this.syncPan();
};

ChartZoomerView.prototype._handleResizeStart = function (input) {
  const gesture = this._createGesture(input.pageX, this.host.getBoundingClientRect().width);

  switch (input.target.className) {
  case 'chart-zoomer__pan':
    this._touchPoints[input.identifier] = gesture(
      this._setLeftAndRight,
      [ this._offsetLeft, 100 - this._offsetLeft - this._offsetRight ]
    );
    break;
  case 'chart-zoomer__pan-left-ruler':
    this._touchPoints[input.identifier] = gesture(this._setLeft, this._offsetLeft);
    break;
  case 'chart-zoomer__pan-right-ruler':
    this._touchPoints[input.identifier] = gesture(this._setRight, this._offsetRight);
    break;
  }
};

ChartZoomerView.prototype._createGesture = function (capturedPageX, totalWidth) {
  return (fn, extra) => (pageX) => {
    const deltaX = pageX - capturedPageX;
    const deltaPercent = deltaX / totalWidth * 100;

    fn.call(this, deltaPercent, extra);

    this.syncPan();
  };
};

ChartZoomerView.prototype._setLeftAndRight = function (delta, [ capturedLeft, capturedSize ]) {
  const capturedRight = 100 - capturedLeft - capturedSize;
  const limitedDelta = Math.max(
    -capturedLeft,
    Math.min(
      delta,
      capturedRight
    )
  );

  this._setLeft(limitedDelta, capturedLeft);
  this._setRight(limitedDelta, capturedRight);
};

ChartZoomerView.prototype._setLeft = function (delta, capturedLeft) {
  this._offsetLeft = Math.max(
    0,
    Math.min(
      100 - this._offsetRight - this._minSize,
      capturedLeft + delta
    )
  );
};

ChartZoomerView.prototype._setRight = function (delta, capturedRight) {
  this._offsetRight = Math.max(
    0,
    Math.min(
      100 - this._offsetLeft - this._minSize,
      capturedRight - delta
    )
  );
};

ChartZoomerView.prototype.syncPan = function (left = this._offsetLeft, right = this._offsetRight) {
  const size = 100 - left - right;
  this.pan.style.left = String(left) + '%';
  this.pan.style.width = String(size) + '%';

  const totalCount = this._presenter.axis.length;
  this.idxStart = Math.floor(totalCount / 100 * left);
  this.idxEnd = this.idxStart + Math.floor(totalCount / 100 * size) - 1;

  this._presenter.handlePan();
}

ChartZoomerView.prototype._addPassiveListener = (function () {
  let supportsPassive = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get () {
        supportsPassive = true;
      }
    });
    window.addEventListener("testPassive", null, opts);
    window.removeEventListener("testPassive", null, opts);
  } catch (e) {}

  return function (target, evt, handler) {
    const opts = supportsPassive ? { passive: true } : false;
    target.addEventListener(evt, handler, opts);
  };
}());
