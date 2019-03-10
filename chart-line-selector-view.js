const chartLineSelectorItemTemplate = document.getElementById('line-selector-item-template').innerHTML;

function ChartLineSelectorView (presenter) {
  if (!(this instanceof ChartLineSelectorView)) {
    return new ChartLineSelectorView(presenter);
  }

  this._presenter = presenter;
  this.host = document.createElement('form');
  this.host.onclick = (evt) => {
    if (evt.target.matches('input[type=checkbox]')) {
      this._presenter.handleLineSelection();
    }
  };
}

ChartLineSelectorView.prototype.update = function () {
  this.host.innerHTML = this._presenter.renderData.reduce((html, item) => {
    return html + template(chartLineSelectorItemTemplate, item);
  }, '');
}

ChartLineSelectorView.prototype.getShouldRender = function (lineName) {
  return () => {
    const retVal = lineName in this.host.elements
      ? this.host.elements[lineName].checked
      : true;

    console.log(lineName, retVal);
    return retVal;
  };
};
