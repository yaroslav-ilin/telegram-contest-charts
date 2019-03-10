function ChartView (presenter) {
  if (!(this instanceof ChartView)) {
    return new ChartView(presenter);
  }

  this._presenter = presenter;
  this._lines = [];
  this.host = createSVGNode('svg', {
    'class': 'chart',
    'viewBox': '0 0 ' + presenter.nominalWidth + ' ' + presenter.nominalHeight,
  });
}

ChartView.prototype.render = function () {
  const lines = this._presenter.renderData;

  if (lines.length === this._lines.length) {
    this._update(lines);
  } else {
    this._invalidate(lines);
  }
};

ChartView.prototype._invalidate = function (lines) {
  this._lines = lines;
  this.host.innerHTML = '';

  lines.forEach(({ color, shouldRender, points }) => {
    const path = createSVGNode('path', {
      'class': 'chart__polyline',
      'stroke': color,
      'd': 'M' + points,
    });
    if (shouldRender) {
      path.classList.remove('chart__polyline_invisible');
    } else {
      path.classList.add('chart__polyline_invisible');
    }

    path.appendChild(
      createSVGNode('animate', {
        attributeName: 'd',
        dur: '0.3s',
        fill: 'freeze',
      })
    );

    this.host.appendChild(path);
  });
};

ChartView.prototype._update = function (lines) {
  Array.prototype.forEach.call(this.host.querySelectorAll('path'), (path, idx) => {
    const oldLine = this._lines[idx];
    const newLine = lines[idx];
    if (newLine.shouldRender) {
      path.classList.remove('chart__polyline_invisible');
    } else {
      path.classList.add('chart__polyline_invisible');
    }

    const animate = path.querySelector('animate');
    animate.setAttributeNS(null, 'from', 'M' + oldLine.points);
    animate.setAttributeNS(null, 'to', 'M' + newLine.points);
    animate.beginElement();

    path.setAttributeNS(null, 'd', 'M' + newLine.points);
  });
  this._lines = lines;
};
