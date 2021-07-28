class Settings {
  constructor() {
    this.themes = ['', 'silver-theme', 'dark-theme', 'butter-theme'];
    this.themeIndex = this.getThemeIndex();
  }

  getThemeIndex() {
    if (typeof this.themeIndex === 'number') return this.themeIndex;

    let settings = localStorage.getItem('settings');
    if (settings === null) return 0;
    settings = JSON.parse(settings);
    if (typeof settings.themeIndex === 'undefined') return 0;
    // eslint-disable-next-line radix
    return parseInt(settings.themeIndex);
  }

  getThemeName() {
    return this.themes[this.themeIndex];
  }

  setTheme(themeIndex) {
    const appBody = document.getElementById('appBody');
    this.themes.forEach((themeName) => {
      if (themeName === '') return;
      appBody.classList.remove(themeName);
    });
    if (this.themes[themeIndex] !== '') appBody.classList.add(this.themes[themeIndex]);
    localStorage.setItem('settings', JSON.stringify({ themeIndex }));
    this.themeIndex = themeIndex;
  }
}

const settings = new Settings();

export default settings;
