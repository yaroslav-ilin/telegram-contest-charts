const Theme = {
  init () {
    Theme._toggler.innerHTML = Theme._togglerText.toNight;
    Theme._toggler.onclick = Theme.toggle;
  },

  current () {
    return (
      document.body.classList.contains('theme-context_night') === true
        ? 'night'
        : 'day'
    );
  },

  toggle () {
    if (Theme.current() === 'day') {
      document.body.classList.add('theme-context_night');
      Theme._toggler.innerHTML = Theme._togglerText.toDay;
    } else {
      document.body.classList.remove('theme-context_night');
      Theme._toggler.innerHTML = Theme._togglerText.toNight;
    }
  },

  _toggler: document.getElementById('themeToggle'),
  _togglerText: {
    toDay: 'Switch to Day Mode',
    toNight: 'Switch to Night Mode',
  },
};

Theme.init();


DataLoader.load('./chart_data.json').then(function (_charts) {
  const charts = _charts.map((chart, idx) => ({
    ...chart,
    title: chart.title || ('Chart #' + String(idx + 1)),
  }));
  const presenter = window.PRESENTER = new ChartPresenter();

  presenter.load(charts[0]);

  presenter.attach(document.getElementById('chart'));
});
