const Theme = {
  init () {
    if (localStorage.getItem('theme') === 'night') {
      document.body.classList.add('theme-context_night');
      Theme._toggler.innerHTML = Theme._togglerText.toDay;
    } else {
      Theme._toggler.innerHTML = Theme._togglerText.toNight;
    }
    Theme._toggler.onclick = Theme.toggle;
  },

  current () {
    return (
      document.body.classList.contains('theme-context_night') === true
        ? 'night'
        : 'day'
    );
  },

  toggle () {
    if (Theme.current() === 'day') {
      localStorage.setItem('theme', 'night');
      document.body.classList.add('theme-context_night');
      Theme._toggler.innerHTML = Theme._togglerText.toDay;
    } else {
      localStorage.setItem('theme', 'day');
      document.body.classList.remove('theme-context_night');
      Theme._toggler.innerHTML = Theme._togglerText.toNight;
    }
  },

  _toggler: document.getElementById('themeToggle'),
  _togglerText: {
    toDay: 'Switch to Day Mode',
    toNight: 'Switch to Night Mode',
  },
};

Theme.init();
