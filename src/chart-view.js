function ChartView (presenter, config) {
  if (!(this instanceof ChartView)) {
    return new ChartView(presenter, config);
  }

  this._presenter = presenter;
  this._config = config;
  this._updateAnimStrategy = config.updateAnimStrategy || new ChartUpdateAnimationStrategyEmpty();
  this._classNames = ['chart'].concat(config.baseClassName ? [ config.baseClassName ] : []);
  this._axis = [];
  this._lines = [];
  this._nominalWidth = config.w;
  this._nominalHeight = config.h;
  this.host = createSVGNode('svg', {
    'class': this._classNames.join(' '),
    'viewBox': '0 0 ' + this._nominalWidth + ' ' + this._nominalHeight,
  });
}

ChartView.prototype.prepareAxis = function (axis) {
  this._axis = axis.map((date, idx) => {
    const node = createSVGNode('text', {
      'class': 'chart__x',
      'id': 'x' + idx,
      'y': '100%',
    });
    node.innerHTML = dateFormat(date);
    node.appendChild(
      createSVGNode('animate', {
        attributeName: 'd',
        dur: '0.3s',
        fill: 'freeze',
      })
    );

    return node;
  });
};

ChartView.prototype.render = function (idxStart = 0, idxEnd = this._presenter.lines[0].raw.length) {
  const lines = this._presenter.lines;

  const renderedCount = idxEnd - idxStart;
  const renderedLines = lines.filter(line => line.shouldRender);

  if (renderedCount <= 0) {
    return this._hide();
  }

  let minValue = Infinity;
  let maxValue = -Infinity;
  for (let i = idxStart; i < idxEnd; i++) {
    const itemsAtIdx = renderedLines.map(line => line.raw[i]);
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

  // FIXME: x points can be counted once per chart, not per line
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
    // this._renderAxis({ idxStart, idxEnd, horizontalStep, verticalStep });
    return this._update(renderData);
  } else {
    this._invalidate(renderData);
    // this._renderAxis({ idxStart, idxEnd, horizontalStep, verticalStep });
    return Promise.resolve();
  }
};

ChartView.prototype._renderAxis = function ({ idxStart, idxEnd, horizontalStep, verticalStep }) {
  this._axis.forEach(function (node, idx) {
    const isFirst = idx === idxStart;
    const isLast = idx === idxEnd;
    let classNames = 'chart__x';
    classNames += ' chart__x_visible';

    if (isFirst || isLast) {
      if (isLast) {
        classNames += ' chart__x_last';
      }
    // } else {
    //   node.removeAttributeNS(null, 'x');
    }

    node.setAttributeNS(null, 'class', classNames);
    node.setAttributeNS(null, 'x', parseFloat((horizontalStep * (idx - idxStart)).toFixed(3)));
  });
};

ChartView.prototype._hide = function () {
  return this._update(this._lines.map(function (line) {
    return {
      ...line,
      shouldRender: false,
    };
  }));
};

ChartView.prototype._invalidate = function (lines) {
  this._lines = lines;

  const xContainer = createSVGNode('g', {
    'class': 'chart__x-container',
  });
  this._axis.forEach(item => xContainer.appendChild(item));

  const linesContainer = createSVGNode('g', {
    'class': 'chart__lines-container',
  });
  lines.forEach(({ color, shouldRender, points }) => {
    const classNameMapper = shouldRender
      ? function (cl) { return [ cl, cl + '__polyline' ].join(' ') }
      : function (cl) { return [ cl, cl + '__polyline', cl + '__polyline_invisible' ].join(' ') };
    const path = createSVGNode('path', {
      'class': this._classNames.map(classNameMapper).join(' '),
      'stroke': color,
      'd': 'M' + points,
    });

    this._updateAnimStrategy.hook(path);

    linesContainer.appendChild(path);
  });

  this.host.innerHTML = '';
  this.host.appendChild(xContainer);
  this.host.appendChild(linesContainer);
};

ChartView.prototype._update = function (lines) {
  const oldLines = this._lines;
  const updateAnimStrategy = this._updateAnimStrategy;
  const classNames = this._classNames;

  this._lines = lines;
  return Promise.all(
    Array.prototype.map.call(this.host.querySelectorAll('path'), function (path, idx) {
      const oldLine = oldLines[idx];
      const newLine = lines[idx];

      const classNameMapper = newLine.shouldRender
        ? function (cl) { return [ cl, cl + '__polyline' ].join(' ') }
        : function (cl) { return [ cl, cl + '__polyline', cl + '__polyline_invisible' ].join(' ') };
      path.setAttribute('class', classNames.map(classNameMapper).join(' '));

      return updateAnimStrategy.trigger(path, oldLine, newLine);
    })
  );
};
