const chartLineSelectorItemTemplate = document.getElementById('line-selector-item-template').innerHTML;

/**
  @constructor
 */
function ChartLineSelectorView (presenter) {
  if (!(this instanceof ChartLineSelectorView)) {
    return new ChartLineSelectorView(presenter);
  }

  this._presenter = presenter;
  this.host = document.createElement('form');
  this.host.className = 'chart-lines-selector';
  this.host.onclick = (evt) => {
    if (evt.target.matches('input[type=checkbox]')) {
      this._presenter.handleLineSelection(this.host.elements);
    }
  };
}

ChartLineSelectorView.prototype.update = function () {
  this.host.innerHTML = this._presenter.lines.reduce(function (html, item) {
    return html + template(chartLineSelectorItemTemplate, item);
  }, '');
}
