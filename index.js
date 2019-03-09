const svgNS = "http://www.w3.org/2000/svg";

const colors = [
  '#4bb450',
  '#fa6955',
];

const datasources = [
  {
    tag: 'Joined',
    raw: [
      ['2018-03-03', 110],
      ['2018-03-04', 75],
      ['2018-03-05', 175],
      ['2018-03-06', 69],
      ['2018-03-07', 255],
      ['2018-03-08', 125],
      ['2018-03-09', 120],
      ['2018-03-10', 150],
      ['2018-03-11', 55],
      ['2018-03-12', 65],
      ['2018-03-13', 52],
      ['2018-03-14', 80],
    ],
  },
  {
    tag: 'Left',
    raw: [
      ['2018-03-03', 49],
      ['2018-03-04', 51],
      ['2018-03-05', 70],
      ['2018-03-06', 53],
      ['2018-03-07', 90],
      ['2018-03-08', 53],
      ['2018-03-09', 75],
      ['2018-03-10', 54],
      ['2018-03-11', 47],
      ['2018-03-12', 53],
      ['2018-03-13', 26],
      ['2018-03-14', 52],
    ],
  }
];


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

function render (datasources, host) {
  const nominalWidth = host.viewBox.baseVal.width;
  const nominalHeight = host.viewBox.baseVal.height;

  const flatValues = datasources.reduce((xs, x) => xs.concat(x.raw), []);
  const flatRawValues = flatValues.map(point => point[1]);
  const minValue = Math.min(0, Math.min(...flatRawValues));
  const maxValue = Math.max(...flatRawValues);

  const horizontalStep = nominalWidth / datasources[0].raw.length;
  const verticalStep = nominalHeight / (maxValue - minValue);

  host.innerHTML = '';
  datasources.forEach((datasource, idx) => {
    const color = colors[idx % colors.length];

    const polyline = document.createElementNS(svgNS, 'polyline');
    polyline.setAttributeNS(null, 'fill', 'none');
    polyline.setAttributeNS(null, 'stroke-width', '2');
    polyline.setAttributeNS(null, 'stroke', color);
    datasource.raw.forEach((item, idx) => {
      const point = host.createSVGPoint();
      point.x = horizontalStep * idx;
      point.y = nominalHeight - verticalStep * item[1];
      polyline.points.appendItem(point);
    });
    host.appendChild(polyline);
  });
}

function template (template, obj) {
  return template.replace(/\{([^}]+)\}/g, (interpolation, path) => obj[path]);
}

const axisSelector = document.getElementById('axis-selector');

function renderFiltered () {
  const selectedDataSources = datasources.filter(datasource => 
    axisSelector.elements[datasource.tag].checked
  );

  render(
    validateData(selectedDataSources),
    document.getElementById('line-chart')
  );
}

axisSelector.innerHTML = datasources.reduce((html, item) => {
  return html + template(
    document.getElementById('axis-selector-item-template').innerHTML,
    item
  );
}, '');

axisSelector.addEventListener('click', renderFiltered, false);
renderFiltered();
