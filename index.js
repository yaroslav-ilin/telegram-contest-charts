DataLoader.load('./chart_data.json').then(function (charts) {
  const presenter = window.PRESENTER = new ChartPresenter();

  presenter.load(charts[0]);

  presenter.attach(document.getElementById('chart'));
});
