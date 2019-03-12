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
  this.handleLineSelection = function () {
    this._chartZoomerView.render();
    this._chartView.render();
  }.bind(this);
  this._chartLineSelectorView = new ChartLineSelectorView(this);

  // derived fields
  this.axis = {};
  this.lines = [];
}

ChartPresenter.prototype.load = function (data) {
  this._input = data;

  this.lines = [];
  this._input.columns.forEach(function (column) {
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
          enumerable: true,
        });
        this.lines.push(line);
        break;
      }
    }
  }.bind(this));

  this._chartView.render();
  this._chartLineSelectorView.update();
};

ChartPresenter.prototype.attach = function (parent) {
  parent.appendChild(this._chartView.host);
  parent.appendChild(this._chartZoomerView.host);
  parent.appendChild(this._chartLineSelectorView.host);
  this._chartZoomerView.render();
};

