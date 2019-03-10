const chartZoomerTemplate = document.getElementById('chart-zoomer-template').innerHTML;

function ChartZoomerView (presenter, chart) {
  if (!(this instanceof ChartZoomerView)) {
    return new ChartZoomerView(presenter, chart);
  }
  this._presenter = presenter;
  this._chart = chart;

  this.host = document.createElement('div');
  this.host.className = 'chart-zoomer';
  this.host.innerHTML = template(chartZoomerTemplate);
  this.host.insertBefore(this._chart.host, this.host.firstChild);

  this.totalWidth = 100;
  this.minWidth = 10;
  this.currentPanOffset = 0;
  this.currentPanWidth = 100;

  let currentGesture = null;
  let startCoords = null;
  this.host.onmousedown = (evt) => {
    startCoords = [ evt.clientX, this.currentPanOffset, this.currentPanWidth ];

    switch (evt.target.className) {
    case 'chart-zoomer__pan':
      currentGesture = 'drag';
      break;
    case 'chart-zoomer__pan-left-border':
      currentGesture = 'resize-left';
      break;
    case 'chart-zoomer__pan-right-border':
      currentGesture = 'resize-right';
      break;
    }
  };
  this.host.onmousemove = (evt) => {
    switch (currentGesture) {
      case 'drag': {
        const positionX = startCoords[1] - (startCoords[0] - evt.clientX);

        this.currentPanOffset = Math.max(
          0,
          Math.min(this.totalWidth - this.currentPanWidth, positionX)
        );
        break;
      }
      case 'resize-left': {
        const positionOffset = -(startCoords[0] - evt.clientX);
        this.currentPanOffset = Math.max(
          0,
          Math.min(startCoords[1] + positionOffset, this.totalWidth - this.minWidth)
        );
        this.currentPanWidth = Math.max(
          this.minWidth, 
          Math.min(startCoords[2] - positionOffset, this.totalWidth - this.currentPanOffset)
        );
        break;
      }
      case 'resize-right': {
        const positionX = startCoords[2] - (startCoords[0] - evt.clientX);
        this.currentPanWidth = Math.max(
          this.minWidth, 
          Math.min(positionX, this.totalWidth - this.currentPanOffset)
        );
        break;
      }
    }
    this.syncPan();
  };
  this.host.onmouseup = () => {
    currentGesture = null;
  };
}

ChartZoomerView.prototype.syncPan = function () {
  this.host.querySelector('.chart-zoomer__pan').style =
    'width: ' + this.currentPanWidth + 'px;' +
    'transform: translateX(' + this.currentPanOffset + 'px)';
};

ChartZoomerView.prototype.render = function (lines) {
  this._chart.render(lines);
  this.totalWidth = this.host.getBoundingClientRect().width;
  this.minWidth = this.totalWidth * .1;
  this.currentPanWidth = this.totalWidth / 5;
  this.currentPanOffset = this.totalWidth - this.currentPanWidth;
  this.syncPan();
};
