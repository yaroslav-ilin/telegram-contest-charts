function ChartView (presenter, config) {
  if (!(this instanceof ChartView)) {
    return new ChartView(presenter, config);
  }

  this._presenter = presenter;
  this._config = config;
  this._updateAnimStrategy = config.updateAnimStrategy || new ChartUpdateAnimationStrategyEmpty();
  this._classNames = ['chart'].concat(config.baseClassName ? [ config.baseClassName ] : []);
  this._lines = [];
  this._horizontalStep = 0;
  this._verticalStep = 0;
  this._nominalWidth = config.w;
  this._nominalHeight = config.h;
  this.host = createSVGNode('svg', {
    'class': this._classNames.join(' '),
    'viewBox': '0 0 ' + this._nominalWidth + ' ' + this._nominalHeight,
  });
}

ChartView.prototype.render = function (lines) {
  this._horizontalStep = this._presenter.axis.length > 0
    ? this._nominalWidth / this._presenter.axis.length
    : 0;
  const baseLine = this._presenter.maxValue - this._presenter.minValue;
  this._verticalStep = baseLine !== 0
    ? this._nominalHeight / baseLine
    : 0;

  const renderData = lines.map(function ({ tag, name, color, shouldRender, raw }) {
    return {
      tag,
      name,
      color,
      shouldRender,
      points: raw
        .map(function (point, idx) {
          return parseFloat((this._horizontalStep * idx).toFixed(3))
            + ','
            + parseFloat((this._nominalHeight - this._verticalStep * (point - this._presenter.minValue)).toFixed(3));
        }.bind(this))
        .join(' '),
    };
  }.bind(this));

  if (lines.length === this._lines.length) {
    this._update(renderData);
  } else {
    this._invalidate(renderData);
  }
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
    const newLine = lines[idx];

    this._updateAnimStrategy.trigger(path, this._lines[idx], newLine);

    const classNameMapper = newLine.shouldRender
      ? function (cl) { return [ cl, cl + '__polyline' ].join(' ') }
      : function (cl) { return [ cl, cl + '__polyline', cl + '__polyline_invisible' ].join(' ') };
    path.setAttribute('class', this._classNames.map(classNameMapper).join(' '));
  }.bind(this));
  this._lines = lines;
};
