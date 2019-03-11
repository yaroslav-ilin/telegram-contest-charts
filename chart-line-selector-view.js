const chartLineSelectorItemTemplate = document.getElementById('line-selector-item-template').innerHTML;

function ChartLineSelectorView (presenter) {
  if (!(this instanceof ChartLineSelectorView)) {
    return new ChartLineSelectorView(presenter);
  }

  this._presenter = presenter;
  this.host = document.createElement('form');
  this.host.onclick = function (evt) {
    if (evt.target.matches('input[type=checkbox]')) {
      this._presenter.handleLineSelection();
    }
  }.bind(this);
}

ChartLineSelectorView.prototype.update = function () {
  this.host.innerHTML = this._presenter.lines.reduce(function (html, item) {
    return html + template(chartLineSelectorItemTemplate, item);
  }, '');
}

ChartLineSelectorView.prototype.getShouldRender = function (lineName) {
  return function () {
    const retVal = lineName in this.host.elements
      ? this.host.elements[lineName].checked
      : true;

    return retVal;
  }.bind(this);
};
