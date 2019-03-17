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

ChartView.prototype.render = function (idxStart = 0, idxEnd = this._presenter.lines[0].raw.length) {
  const lines = this._presenter.lines;

  const renderedCount = idxEnd - idxStart;
  const renderedLines = lines.filter(function (line) {
    return line.shouldRender;
  });

  if (renderedCount <= 0) {
    this._hide();
    return;
  }

  let minValue = Infinity;
  let maxValue = -Infinity;
  for (let i = idxStart; i < idxEnd; i++) {
    const itemsAtIdx = renderedLines.map(function (line) { return line.raw[i] });
    minValue = Math.min(minValue, Math.min(...itemsAtIdx));
    maxValue = Math.max(maxValue, Math.max(...itemsAtIdx));
  }
  if (minValue === Infinity || maxValue === -Infinity) {
    minValue = maxValue = 0;
  }

  const horizontalStep = this._nominalWidth / renderedCount;
  const baseLine = maxValue - minValue;
  const nominalHeight = this._nominalHeight;
  const verticalStep = baseLine === 0 ? 0 : nominalHeight / baseLine;

  const renderData = lines.map(function ({ tag, name, color, shouldRender, raw }) {
    const totalPointsCount = raw.length;
    const points = new Array(totalPointsCount);

    for (let i = 0; i < totalPointsCount; i++) {
      points[i] = parseFloat((horizontalStep * (i - idxStart)).toFixed(3)) +
        ',' +
        parseFloat((nominalHeight - verticalStep * (raw[i] - minValue)).toFixed(3));
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
  const oldLines = this._lines;
  const updateAnimStrategy = this._updateAnimStrategy;
  const classNames = this._classNames;

  Array.prototype.forEach.call(this.host.querySelectorAll('path'), function (path, idx) {
    const oldLine = oldLines[idx];
    const newLine = lines[idx];

    updateAnimStrategy.trigger(path, oldLine, newLine);

    const classNameMapper = newLine.shouldRender
      ? function (cl) { return [ cl, cl + '__polyline' ].join(' ') }
      : function (cl) { return [ cl, cl + '__polyline', cl + '__polyline_invisible' ].join(' ') };
    path.setAttribute('class', classNames.map(classNameMapper).join(' '));
  });
  this._lines = lines;
};
