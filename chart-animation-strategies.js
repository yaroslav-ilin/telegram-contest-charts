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
  if (newLine.shouldRender) {
    path.setAttributeNS(null, 'd', 'M' + newLine.points);

    if (oldLine.shouldRender) {
      const animate = path.querySelector('animate');
      animate.setAttributeNS(null, 'from', 'M' + oldLine.points);
      animate.setAttributeNS(null, 'to', 'M' + newLine.points);
      animate.beginElement();
    }
  }
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
  animate.setAttributeNS(null, 'from', 'M' + oldLine.points);
  animate.setAttributeNS(null, 'to', 'M' + newLine.points);
  animate.beginElement();

  path.setAttributeNS(null, 'd', 'M' + newLine.points);
};
