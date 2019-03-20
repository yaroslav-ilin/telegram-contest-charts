function ChartUpdateAnimationStrategyEmpty () {}
ChartUpdateAnimationStrategyEmpty.prototype.hook = function (path) {
  path.appendChild(
    createSVGNode('animate', {
      attributeName: 'd',
      dur: '0.3s',
      fill: 'freeze',
    })
  );
};
ChartUpdateAnimationStrategyEmpty.prototype.trigger = function (path, oldLine, newLine) {
  const shouldRenderOld = oldLine.shouldRender;
  const shouldRenderNew = newLine.shouldRender;

  if (shouldRenderNew) {
    return new Promise(resolve => {
      const toPoints = 'M' + newLine.points;

      // FIXME: extract rAF to the caller to sync the lines on the chart
      this.raf(() => {
        if (shouldRenderOld) {
          const animate = path.querySelector('animate');
          animate.onend = resolve;
          animate.setAttributeNS(null, 'from', 'M' + oldLine.points);
          animate.setAttributeNS(null, 'to', toPoints);
          animate.beginElement();
        } else {
          resolve();
        }
  
        path.setAttributeNS(null, 'd', toPoints);
      });
    });
  } else {
    return Promise.resolve();
  }
};
ChartUpdateAnimationStrategyEmpty.prototype.raf = typeof requestAnimationFrame === 'function'
? requestAnimationFrame.bind(window)
: function (cb) {
  cb();
};

function ChartUpdateAnimationStrategySmooth () {}
ChartUpdateAnimationStrategySmooth.prototype.hook = function (path) {
  path.appendChild(
    createSVGNode('animate', {
      attributeName: 'd',
      dur: '0.3s',
      fill: 'freeze',
    })
  );
};
ChartUpdateAnimationStrategySmooth.prototype._triggerRAF = function (path, oldLine, newLine) {
  return new Promise(resolve => {
    const toPoints = 'M' + newLine.points;

    this.raf(() => {
      const animate = path.querySelector('animate');
      animate.setAttributeNS(null, 'from', 'M' + oldLine.points);
      animate.setAttributeNS(null, 'to', toPoints);
      animate.beginElement();
      path.setAttributeNS(null, 'd', toPoints);

      const start = animate.getStartTime();
      const duration = animate.getSimpleDuration();
      const end = start + duration;
      const rAFiteration = () => {
        if (animate.getCurrentTime() >= end) {
          resolve();
        } else {
          this.raf(rAFiteration);
        }
      };
      rAFiteration();
    });
  });
};
ChartUpdateAnimationStrategySmooth.prototype._triggerWithEvent = function (path, oldLine, newLine) {
  return new Promise(resolve => {
    const toPoints = 'M' + newLine.points;

    this.raf(() => {
      const animate = path.querySelector('animate');
      animate.onend = resolve;
      animate.setAttributeNS(null, 'from', 'M' + oldLine.points);
      animate.setAttributeNS(null, 'to', toPoints);
      animate.beginElement();
      path.setAttributeNS(null, 'd', toPoints);
    });
  });
};
ChartUpdateAnimationStrategySmooth.prototype.trigger = (function () {
  return typeof createSVGNode('animate', {}).onend === 'undefined'
    ? ChartUpdateAnimationStrategySmooth.prototype._triggerRAF
    : ChartUpdateAnimationStrategySmooth.prototype._triggerWithEvent;
}());

ChartUpdateAnimationStrategySmooth.prototype.raf =
typeof requestAnimationFrame === 'function'
  ? requestAnimationFrame.bind(window)
  : setTimeout.bind(window);
