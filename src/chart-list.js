const Hamburger = {
  init () {
    document.getElementById('root').classList.add('app_selecting');
    Hamburger._toggler.onclick = Hamburger.toggle;
  },

  toggle () {
    document.getElementById('root').classList.toggle('app_selecting');
  },

  _toggler: document.getElementById('hamburger'),
};

Hamburger.init();

function ChartList (appParent) {
  this.host = appParent;
  this.list = document.getElementById('chart-list');
  this.mainPresenter = null;
  this.datasource = [];

  this.setLoading(true);
  DataLoader.load('./chart_data.json').then((_charts) => {
    this.datasource = _charts.map((chart, idx) => ({
      ...chart,
      title: chart.title || ('Chart #' + String(idx + 1)),
    }));

    this.renderCharts();
    this.setLoading(false);
  });
  this._handleChartSelected = (chartId) => () => {
    this.selectChart(chartId);
    Hamburger.toggle();
  };
}
ChartList.prototype.renderCharts = function () {
  this.list.innerHTML = '';
  this.datasource.forEach((chart, idx) => {
    const source = this._transformData(chart);
    const view = new ChartView(source, { w: 500, h: 50 });

    const container = document.createElement('button');
    container.className = 'button chart-list__item';
    container.onclick = this._handleChartSelected(idx);
    container.appendChild(view.host);
    this.list.appendChild(container);
    view.render();
  });
};
ChartList.prototype._transformData = function (source) {
  const lines = [];
  let axis = [];

  source['columns'].forEach(column => {
    const columnKey = column[0];

    switch (columnKey) {
      case 'x':
        axis = column.slice(1).map(timestamp => new Date(timestamp));
        break;
      default: {
        lines.push({
          tag: columnKey,
          name: source['names'][columnKey],
          color: source['colors'][columnKey],
          type: source['types'][columnKey],
          shouldRender: true,
          raw: column.slice(1),
        });
        break;
      }
    }
  });

  return { source, axis, lines };
};
ChartList.prototype.setLoading = function (isLoading) {
  if (isLoading) {
    this.host.classList.add('app_loading');
  } else {
    this.host.classList.remove('app_loading');
  }
};
ChartList.prototype.selectChart = function (chartId) {
  if (this.mainPresenter) {
    this.mainPresenter.dispose();
  }

  this.mainPresenter = new ChartPresenter();

  this.mainPresenter.load(this._transformData(this.datasource[chartId]));

  this.mainPresenter.attach(document.getElementById('chart'));
};
