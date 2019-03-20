function ChartPresenter () {
  if (!(this instanceof ChartPresenter)) {
    return new ChartPresenter();
  }

  this._input = null;
  this._host = null;
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

  document.querySelector('.app__title').innerHTML = data.title;

  this.lines = [];
  this._input.columns.forEach(column => {
    const columnKey = column[0];

    switch (columnKey) {
      case 'x':
        this.axis = column.slice(1).map(timestamp => new Date(timestamp));
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
  });

  this._chartView.prepareAxis(this.axis);
  this._chartZoomerView.render();
  this._chartLineSelectorView.update();
};

ChartPresenter.prototype.attach = function (parent) {
  this._host = parent;

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
  let isAnimationPending = false;
  let nextAnimation = null;

  return function () {
    nextAnimation = () => {
      nextAnimation = null;

      const { idxStart, idxEnd } = this._chartZoomerView;
      return this._chartView.render(idxStart, idxEnd)
        .then(() => nextAnimation ? nextAnimation() : null);
    };

    if (!isAnimationPending) {
      isAnimationPending = true;
      nextAnimation().then(() => {
        isAnimationPending = false;
      });
    }
  };
}());

ChartPresenter.prototype.dispose = function () {
  this._chartZoomerView.dispose();
  if (this._host) {
    this._host.innerHTML = '';
  }
};
