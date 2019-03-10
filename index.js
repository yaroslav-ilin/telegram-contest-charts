function validateData (datasource) {
  if (!datasource.length) {
    throw new Error('empty or invalid datasource');
  }
  datasource.forEach(data => {
    if (data.raw.length !== datasource[0].raw.length) {
      throw new Error('datasource contains rows of unequal length');
    }
  });
  return datasource;
}

const CHART = {
  colors: [
    '#4bb450',
    '#fa6955',
  ],

  init (parent) {
    CHART._host = createSVGNode('svg', {
      'class': 'chart',
      'viewBox': '0 0 500 300',
    });

    parent.innerHTML = '';
    parent.appendChild(CHART._host);
  },

  invalidate (timeseries) {
    if (CHART._timeseries.length === timeseries.length) {
      return;
    }

    CHART._host.innerHTML = '';
    timeseries.forEach((_, idx) => {
      const color = CHART.colors[idx % CHART.colors.length];
      const path = createSVGNode('path', {
        'class': 'chart__polyline',
        'stroke': color,
      });
      path.appendChild(
        createSVGNode('animate', {
          attributeName: 'd',
          dur: '0.3s',
          fill: 'freeze',
        })
      );
      CHART._host.appendChild(path);
    });
  },

  render (timeseries) {
    const host = CHART._host;

    const nominalWidth = host.viewBox.baseVal.width;
    const nominalHeight = host.viewBox.baseVal.height;

    validateData(timeseries);
    CHART.invalidate(timeseries);
  
    const flatValues = timeseries.reduce(
      (xs, x) =>  x.shouldRender ? xs.concat(x.raw) : xs,
      []
    );
    const flatRawValues = flatValues.map(point => point);
    const minValue = Math.min(0, Math.min(...flatRawValues));
    const maxValue = Math.max(...flatRawValues);
  
    const horizontalStep = nominalWidth / timeseries[0].raw.length;
    const verticalStep = nominalHeight / (maxValue - minValue);
  
    Array.prototype.forEach.call(host.querySelectorAll('path'), (path, idx) => {
      const datasource = timeseries[idx];
  
      if (datasource.shouldRender) {
        path.classList.remove('chart__polyline_invisible');
      } else {
        path.classList.add('chart__polyline_invisible');
      }

      const oldPoints = path.getAttributeNS(null, 'd');
      const newPoints = datasource.raw
        .map((item, idx) => {
          return parseFloat((horizontalStep * idx).toFixed(3))
            + ','
            + parseFloat((nominalHeight - verticalStep * item).toFixed(3));
        })
        .join(' ');
  
      if (oldPoints) {
        const animate = path.querySelector('animate');
        animate.setAttributeNS(null, 'from', oldPoints);
        animate.setAttributeNS(null, 'to', 'M' + newPoints);
        animate.beginElement();
      }

      path.setAttributeNS(null, 'd', 'M' + newPoints);
    });

    CHART._timeseries = timeseries;
  },

  _host: null,
  _timeseries: [],
};

// const curvesChooser = document.getElementById('curves-chooser');

DataLoader.load('./chart_data.json').then(function (charts) {
  const presenter = window.PRESENTER = new ChartPresenter(500, 300);
  presenter.load(charts[0]);
  presenter.attach(document.getElementById('chart'));

  // function renderFiltered () {
  //   const selectedDataSources = charts[4].columns.map(datasource => ({
  //     ...datasource,
  //     shouldRender: curvesChooser.elements[datasource.tag].checked,
  //   }));

  //   CHART.render(
  //     selectedDataSources,
  //     document.getElementById('line-chart')
  //   );
  // }

  // curvesChooser.innerHTML = charts[4].columns.reduce((html, item) => {
  //   return html + template(
  //     document.getElementById('curves-chooser-item-template').innerHTML,
  //     item
  //   );
  // }, '');

  // curvesChooser.addEventListener('click', renderFiltered, false);
  // CHART.init(document.getElementById('chart'));
  // renderFiltered();
});
