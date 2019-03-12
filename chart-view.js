function ChartView (presenter, config) {
  if (!(this instanceof ChartView)) {
    return new ChartView(presenter, config);
  }

  this._presenter = presenter;
  this._config = config;
  this._updateAnimStrategy = config.updateAnimStrategy || new ChartUpdateAnimationStrategyEmpty();
  this._classNames = ['chart'].concat(config.baseClassName ? [ config.baseClassName ] : []);
  this._lines = [];
  this._nominalWidth = config.w;
  this._nominalHeight = config.h;
  this.host = createSVGNode('svg', {
    'class': this._classNames.join(' '),
    'viewBox': '0 0 ' + this._nominalWidth + ' ' + this._nominalHeight,
  });
}

ChartView.prototype.render = function (idxStart, idxEnd) {
  const lines = this._presenter.lines;

  idxStart || (idxStart = 0);
  idxEnd || (idxEnd = lines[0].raw.length);
  const renderedCount = idxEnd - idxStart;
  const renderedLines = lines.filter(function (line) {
    return line.shouldRender;
  });

  if (renderedCount <= 0) {
    this._hide();
    return;
  }

  let minValue = 0;
  let maxValue = 0;
  for (let i = idxStart; i < idxEnd; i++) {
    const itemsAtIdx = renderedLines.map(function (line) { return line.raw[i] });
    minValue = Math.min(minValue, Math.min(...itemsAtIdx));
    maxValue = Math.max(maxValue, Math.max(...itemsAtIdx));
  }

  const horizontalStep = this._nominalWidth / renderedCount;
  const baseLine = maxValue - minValue;
  const nominalHeight = this._nominalHeight;
  const verticalStep = baseLine === 0 ? 0 : nominalHeight / baseLine;

  function pointToCoords (point, idx) {
    return parseFloat((horizontalStep * idx).toFixed(3))
      + ','
      + parseFloat((nominalHeight - verticalStep * (point - minValue)).toFixed(3));
  }

  const renderData = lines.map(function ({ tag, name, color, shouldRender, raw }) {
    const totalPointsCount = raw.length;
    const points = new Array(totalPointsCount);

    const startCoords = pointToCoords(raw[idxStart], 0);
    for (let i = 0; i < idxStart + 1; i++) {
      points[i] = startCoords;
    }

    for (let i = idxStart + 1; i < idxEnd - 1; i++) {
      points[i] = pointToCoords(raw[i], i - idxStart);
    }

    const endCoords = pointToCoords(raw[idxEnd - 1], renderedCount);
    for (let i = idxEnd - 1; i < totalPointsCount; i++) {
      points[i] = endCoords;
    }

    return {
      tag,
      name,
      color,
      shouldRender,
      points: points.join(' '),
    };
  });

  if (lines.length === this._lines.length) {
    this._update(renderData);
  } else {
    this._invalidate(renderData);
  }
};

ChartView.prototype._hide = function () {
  this._update(this._lines.map(function (line) {
    return {
      ...line,
      shouldRender: false,
    };
  }));
};

ChartView.prototype._invalidate = function (lines) {
  const that = this;
  this._lines = lines;
  this.host.innerHTML = '';

  lines.forEach(function ({ color, shouldRender, points }) {
    const classNameMapper = shouldRender
      ? function (cl) { return [ cl, cl + '__polyline' ].join(' ') }
      : function (cl) { return [ cl, cl + '__polyline', cl + '__polyline_invisible' ].join(' ') };
    const path = createSVGNode('path', {
      'class': that._classNames.map(classNameMapper).join(' '),
      'stroke': color,
      'd': 'M' + points,
    });

    that._updateAnimStrategy.hook(path);

    that.host.appendChild(path);
  });
};

ChartView.prototype._update = function (lines) {
  Array.prototype.forEach.call(this.host.querySelectorAll('path'), function (path, idx) {
    const oldLine = this._lines[idx];
    const newLine = lines[idx];

    this._updateAnimStrategy.trigger(path, oldLine, newLine);

    const classNameMapper = newLine.shouldRender
      ? function (cl) { return [ cl, cl + '__polyline' ].join(' ') }
      : function (cl) { return [ cl, cl + '__polyline', cl + '__polyline_invisible' ].join(' ') };
    path.setAttribute('class', this._classNames.map(classNameMapper).join(' '));
  }.bind(this));
  this._lines = lines;
};
