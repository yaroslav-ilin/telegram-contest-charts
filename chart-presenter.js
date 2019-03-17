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
        this.lines.push({
          tag: columnKey,
          name: this._input.names[columnKey],
          color: this._input.colors[columnKey],
          type: this._input.types[columnKey],
          shouldRender: true,
          raw: column.slice(1),
        });
        break;
      }
    }
  }.bind(this));

  this._chartZoomerView.render();
  this._chartLineSelectorView.update();
};

ChartPresenter.prototype.attach = function (parent) {
  parent.appendChild(this._chartView.host);
  parent.appendChild(this._chartZoomerView.host);
  parent.appendChild(this._chartLineSelectorView.host);

  this._chartZoomerView.handleAttach();

  const { idxStart, idxEnd } = this._chartZoomerView;
  this._chartView.render(idxStart, idxEnd);
};

ChartPresenter.prototype.handleLineSelection = function (elements) {
  this.lines = this.lines.map(line => ({
    ...line,
    shouldRender: elements[line.tag].checked,
  }));

  this._chartZoomerView.render();

  const { idxStart, idxEnd } = this._chartZoomerView;
  this._chartView.render(idxStart, idxEnd);
};

ChartPresenter.prototype.handlePan = (function () {
  let queuedPan = null;
  let pendingPanAnimation = Promise.resolve();

  return function () {
    if (!queuedPan) {
      pendingPanAnimation.then(() => {
        pendingPanAnimation = queuedPan();
        queuedPan = null;
      });
    }
    queuedPan = () => {
      const { idxStart, idxEnd } = this._chartZoomerView;
      return this._chartView.render(idxStart, idxEnd);
    };
  };
}());
