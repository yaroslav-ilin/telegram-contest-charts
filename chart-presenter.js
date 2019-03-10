function ChartPresenter (w, h) {
  if (!(this instanceof ChartPresenter)) {
    return new ChartPresenter();
  }

  this.nominalWidth = w;
  this.nominalHeight = h;
  this._input = null;
  this._chartView = new ChartView(this);
  this.handleLineSelection = () => {
    this._calculate();
    this._chartView.render();
  };
  this._chartLineSelectorView = new ChartLineSelectorView(this);

  // derived fields
  this._axis = {};
  this._lines = [];
  this._minValue = 0;
  this._maxValue = 0;
  this._horizontalStep = 0;
  this._verticalStep = 0;

  this.renderData = [];
}

ChartPresenter.prototype.load = function (data) {
  this._input = data;

  this._lines = [];
  this._input.columns.forEach(column => {
    const columnKey = column[0];

    switch (columnKey) {
      case 'x':
        this._axis = column.slice(1);
        break;
      default: {
        const line = {
          tag: columnKey,
          name: this._input.names[columnKey],
          color: this._input.colors[columnKey],
          type: this._input.types[columnKey],
          raw: column.slice(1),
        };
        Object.defineProperty(line, 'shouldRender', {
          get: this._chartLineSelectorView.getShouldRender(columnKey),
        });
        this._lines.push(line);
        break;
      }
    }
  });

  this._calculate();

  this._chartView.render();
  this._chartLineSelectorView.update();
};

ChartPresenter.prototype.attach = function (parent) {
  parent.appendChild(this._chartView.host);
  parent.appendChild(this._chartLineSelectorView.host);
};

ChartPresenter.prototype._calculate = function () {
  const flatRawValues = this._lines.reduce(
    (xs, x) =>  x.shouldRender ? xs.concat(x.raw) : xs,
    []
  );

  this._minValue = Math.min(0, Math.min(...flatRawValues));
  this._maxValue = Math.max(...flatRawValues);

  this._horizontalStep = this.nominalWidth / this._axis.length;
  this._verticalStep = this.nominalHeight / (this._maxValue - this._minValue);

  this.renderData = this._lines.map(
    ({ tag, name, color, shouldRender, raw }) => ({
      tag,
      name,
      color,
      shouldRender,
      points: raw
        .map((item, idx) => {
          return parseFloat((this._horizontalStep * idx).toFixed(3))
            + ','
            + parseFloat((this.nominalHeight - this._verticalStep * item).toFixed(3));
        })
        .join(' '),
    })
  );
}
