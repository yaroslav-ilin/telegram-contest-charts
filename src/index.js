DataLoader.load('./chart_data.json').then(function (_charts) {
  const charts = _charts.map((chart, idx) => ({
    ...chart,
    title: chart.title || ('Chart #' + String(idx + 1)),
  }));
  const presenter = window.PRESENTER = new ChartPresenter();

  presenter.load(charts[1]);

  presenter.attach(document.getElementById('chart'));
});
