function ChartPresenter () {
  if (!(this instanceof ChartPresenter)) {
    return new ChartPresenter();
  }

  this._input = null;
  this._chartView = new ChartView(this, {
    baseClassName: 'chart-main',
    updateAnimStrategy: new ChartUpdateAnimationStrategySmooth(),
    w: 500,
    h: 300,
  });
  this._chartZoomerView = new ChartZoomerView(
    this,
    new ChartView(this, {
      baseClassName: 'chart-preview',
      w: 500,
      h: 50,
    })
  );
  this.handleLineSelection = () => {
    this._calculate();
    this._chartZoomerView.render(this.lines);
    this._chartView.render(this.lines);
  };
  this._chartLineSelectorView = new ChartLineSelectorView(this);

  // derived fields
  this.axis = {};
  this.lines = [];
  this.minValue = 0;
  this.maxValue = 0;

  this.renderData = [];
}

ChartPresenter.prototype.load = function (data) {
  this._input = data;

  this.lines = [];
  this._input.columns.forEach(column => {
    const columnKey = column[0];

    switch (columnKey) {
      case 'x':
        this.axis = column.slice(1);
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
        this.lines.push(line);
        break;
      }
    }
  });

  this._calculate();

  this._chartView.render(this.lines);
  this._chartLineSelectorView.update();
};

ChartPresenter.prototype.attach = function (parent) {
  parent.appendChild(this._chartView.host);
  parent.appendChild(this._chartZoomerView.host);
  parent.appendChild(this._chartLineSelectorView.host);
  this._chartZoomerView.render(this.lines);
};

ChartPresenter.prototype._calculate = function () {
  const flatRawValues = this.lines.reduce(
    (xs, x) =>  x.shouldRender ? xs.concat(x.raw) : xs,
    []
  );

  if (flatRawValues.length > 0) {
    this.minValue = Math.max(0, Math.min(...flatRawValues));
    this.maxValue = Math.max(...flatRawValues);
  } else {
    this.minValue = 0;
    this.maxValue = 0;
  }
}
