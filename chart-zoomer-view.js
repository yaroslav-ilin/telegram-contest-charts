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
  
  const move = (deltaX) => {
    this.currentPanOffset = Math.max(
      0,
      Math.min(this.totalWidth - this.currentPanWidth, deltaX)
    );
  };

  const resizeLeft = (deltaX) => {
    this.currentPanOffset = Math.max(
      0,
      Math.min(startCoords[1] + deltaX, this.totalWidth - this.minWidth)
    );
    this.currentPanWidth = Math.max(
      this.minWidth, 
      Math.min(startCoords[2] - deltaX, this.totalWidth - this.currentPanOffset)
    );
  }

  const resizeRight = (deltaX) => {
    this.currentPanWidth = Math.max(
      this.minWidth,
      Math.min(deltaX, this.totalWidth - this.currentPanOffset)
    );
  }

  function handleMouseUpOnce (evt) {
    document.removeEventListener('mouseup', handleMouseUpOnce, false);
    document.removeEventListener('mousemove', handleMouseMove, false);

    currentGesture = null;
  }

  const handleMouseMove = (evt) => {
    switch (currentGesture) {
      case 'drag': {
        move(startCoords[1] - (startCoords[0] - evt.clientX));
        break;
      }
      case 'resize-left': {
        resizeLeft(-(startCoords[0] - evt.clientX));
        break;
      }
      case 'resize-right': {
        resizeRight(startCoords[2] - (startCoords[0] - evt.clientX));
        break;
      }
    }
    this.syncPan();
  };

  this.host.onmousedown = (evt) => {
    document.addEventListener('mousemove', handleMouseMove, false);
    document.addEventListener('mouseup', handleMouseUpOnce, false);
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
