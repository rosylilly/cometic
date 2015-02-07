var gui = require('nw.gui');
var nativeMenuBar = new gui.Menu({ type: "menubar" });
var win = gui.Window.get();

nativeMenuBar.createMacBuiltin("Cometic", {
  hideEdit: true,
  hideWindow: false
});

var fileMenu = new gui.Menu();
fileMenu.append(new gui.MenuItem({
  label: '開く', key: 'o',
  click: function() {
    App.openFile();
  }
}));

var devMenu = new gui.Menu();
devMenu.append(new gui.MenuItem({
  label: 'Open Developer console', modifiers: 'cmd-alt', key: 'i',
  click: function() {
    win.showDevTools();
  }
}));

nativeMenuBar.insert(new gui.MenuItem({ label: 'ファイル', submenu: fileMenu }), 1);
nativeMenuBar.append(new gui.MenuItem({ label: '開発', submenu: devMenu }));

var windowMenu = nativeMenuBar.items[2].submenu;
windowMenu.insert(new gui.MenuItem({
  label: 'フルスクリーン', modifiers: 'cmd-shift', key: 'f',
  click: function() {
    win.toggleFullscreen();
  }
}), 2);

win.menu = nativeMenuBar;

window.App = {
  ready: false,
  onready: null
};

gui.App.on('open', function(path) {
  if(App.ready) {
    App.getBook({ path: path });
  } else {
    App.onready = function() {
      App.getBook({ path: path });
    }
  };
});
