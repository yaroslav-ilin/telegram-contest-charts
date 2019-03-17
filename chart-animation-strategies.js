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
    const animate = path.querySelector('animate');
    // FIXME: extract rAF to the caller to sync the lines on the chart
    this.raf(() => {
      if (shouldRenderOld) {
        animate.setAttributeNS(null, 'from', 'M' + oldLine.points);
        animate.setAttributeNS(null, 'to', 'M' + newLine.points);
        animate.beginElement();
      }

      path.setAttributeNS(null, 'd', 'M' + newLine.points);
    });
    return new Promise(resolve => {
      animate.onend = resolve;
    });
  }

  return Promise.resolve();
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
ChartUpdateAnimationStrategySmooth.prototype.trigger = function (path, oldLine, newLine) {
  const animate = path.querySelector('animate');
  this.raf(() => {
    animate.setAttributeNS(null, 'from', 'M' + oldLine.points);
    animate.setAttributeNS(null, 'to', 'M' + newLine.points);
    animate.beginElement();
    path.setAttributeNS(null, 'd', 'M' + newLine.points);
  });
  return new Promise(resolve => {
    animate.onend = resolve;
  });
};
ChartUpdateAnimationStrategySmooth.prototype.raf =
typeof requestAnimationFrame === 'function'
  ? requestAnimationFrame.bind(window)
  : function (cb) {
    cb();
  };
